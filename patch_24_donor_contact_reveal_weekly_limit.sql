-- LifelineBD PATCH 24: tighten donor contact reveal to 10 successful
-- reveals per rolling 7 days, on top of patch_23's existing 50/hour cap.
-- ----------------------------------------------------------------------------
-- CONTEXT: patch_23's get_donor_contact deliberately lets any authenticated
-- user look up any available donor's contact directly (no prior
-- request/response relationship required) -- a considered product decision
-- to match comparable regional apps and avoid costing time in a genuine
-- emergency. The 50/hour cap was the agreed mitigation for that choice. This
-- patch does NOT reverse that decision and does NOT add a relationship
-- check -- it only tightens the rate limit to match the house rule in
-- .claude/skills/lifelinebd-engineering/SKILL.md section 13: max 10
-- SUCCESSFUL reveals per rolling 7 days, in addition to (not instead of) the
-- existing hourly cap.
--
-- DESIGN:
--   - Reuses the existing donor_contact_reveal_audit table and its
--     'revealed' outcome rows to count the rolling window -- no new table.
--   - Reuses patch_23's existing per-caller pg_advisory_xact_lock, so this
--     check is concurrency-safe for free: the lock already serializes every
--     call from one caller within one transaction, so two simultaneous
--     requests from the same account cannot both observe "9 of 10 used" and
--     both proceed past the check.
--   - Rolling window (now() - interval '7 days'), not calendar-week --
--     a reveal expires exactly 7 days after it happened.
--   - Only successful reveals count toward the cap. denied_* outcomes
--     (including the new denied_weekly_limit) never consume a slot, per the
--     skill's rule that abuse attempts are logged but don't cost the caller.
--
-- Safe to run more than once.
-- ============================================================================

alter table public.donor_contact_reveal_audit
  drop constraint if exists donor_contact_reveal_audit_outcome_check;

alter table public.donor_contact_reveal_audit
  add constraint donor_contact_reveal_audit_outcome_check check (
    outcome in (
      'revealed',
      'denied_missing',
      'denied_unavailable',
      'denied_self',
      'denied_rate_limit',
      'denied_weekly_limit'
    )
  );

create or replace function public.get_donor_contact(p_donor_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  caller_id uuid := auth.uid();
  donor_auth_user_id uuid;
  donor_available boolean;
  donor_phone text;
  donor_whatsapp text;
  hourly_attempts integer;
  weekly_reveals integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_donor_id is null then
    raise exception 'Donor ID is required' using errcode = '22023';
  end if;

  -- Serialize requests from one caller so concurrent calls cannot bypass
  -- either rate limit below.
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  select count(*)::integer
    into hourly_attempts
  from public.donor_contact_reveal_audit
  where caller_auth_user_id = caller_id
    and attempted_at >= now() - interval '1 hour';

  if hourly_attempts >= 50 then
    insert into public.donor_contact_reveal_audit (
      caller_auth_user_id, donor_id, outcome
    ) values (caller_id, p_donor_id, 'denied_rate_limit');
    raise exception 'Contact reveal rate limit exceeded' using errcode = 'P0001';
  end if;

  -- House rule: max 10 SUCCESSFUL reveals per rolling 7 days, independent of
  -- the hourly cap above.
  select count(*)::integer
    into weekly_reveals
  from public.donor_contact_reveal_audit
  where caller_auth_user_id = caller_id
    and outcome = 'revealed'
    and attempted_at >= now() - interval '7 days';

  if weekly_reveals >= 10 then
    insert into public.donor_contact_reveal_audit (
      caller_auth_user_id, donor_id, outcome
    ) values (caller_id, p_donor_id, 'denied_weekly_limit');
    raise exception 'You have reached the limit of 10 donor contacts revealed in the last 7 days' using errcode = 'P0001';
  end if;

  select d.auth_user_id, d.available_now, d.phone, d.whatsapp
    into donor_auth_user_id, donor_available, donor_phone, donor_whatsapp
  from public.donors d
  where d.id = p_donor_id;

  if not found then
    insert into public.donor_contact_reveal_audit (
      caller_auth_user_id, donor_id, outcome
    ) values (caller_id, p_donor_id, 'denied_missing');
    return null;
  end if;

  if donor_auth_user_id = caller_id then
    insert into public.donor_contact_reveal_audit (
      caller_auth_user_id, donor_id, outcome
    ) values (caller_id, p_donor_id, 'denied_self');
    return null;
  end if;

  if coalesce(donor_available, false) is not true then
    insert into public.donor_contact_reveal_audit (
      caller_auth_user_id, donor_id, outcome
    ) values (caller_id, p_donor_id, 'denied_unavailable');
    return null;
  end if;

  insert into public.donor_contact_reveal_audit (
    caller_auth_user_id, donor_id, outcome
  ) values (caller_id, p_donor_id, 'revealed');

  return jsonb_build_object(
    'phone', nullif(donor_phone, ''),
    'whatsapp', nullif(donor_whatsapp, '')
  );
end;
$$;

revoke all on function public.get_donor_contact(uuid)
  from public, anon, authenticated;
grant execute on function public.get_donor_contact(uuid) to authenticated;

-- Verification: anon/public must be false; authenticated must be true.
select
  has_function_privilege('public', 'public.get_donor_contact(uuid)', 'EXECUTE')
    as public_can_execute,
  has_function_privilege('anon', 'public.get_donor_contact(uuid)', 'EXECUTE')
    as anon_can_execute,
  has_function_privilege('authenticated', 'public.get_donor_contact(uuid)', 'EXECUTE')
    as authenticated_can_execute;
