-- LifelineBD PATCH 23: authenticated donor contact reveal
-- ---------------------------------------------------------------------------
-- INCIDENT: Patch 21/22 attempted to expose donor phone in donor_directory_public
-- (an anon-accessible shared view). This created a data-privacy regression:
-- authenticated users could see all donors' phone numbers via a single public view.
-- Patch 21/22 was reverted. Patch 23 replaces it with a defense-in-depth design:
-- - Phone and WhatsApp remain ABSENT from all public projections (views, materialized).
-- - Contacts are returned ONLY by this authenticated, rate-limited RPC.
-- - Every reveal attempt is recorded in a separate audit table for abuse investigation.
-- - The RPC enforces: caller must be authenticated, donor must be available_now,
--   caller cannot reveal their own contact, and reveals are rate-limited to 50/hour.
-- PREVENTION: Future contact-exposure features must not add phone to existing shared
-- views. Use dedicated RPCs (security_definer, rate-limited, audited) instead.
--
-- The existing donor_contact_reveal_log table tracks response calls and is
-- intentionally left untouched. This feature uses a separate audit table.
--
-- Safe to run more than once.

create table if not exists public.donor_contact_reveal_audit (
  id bigint generated always as identity primary key,
  caller_auth_user_id uuid not null,
  donor_id uuid not null,
  attempted_at timestamptz not null default now(),
  outcome text not null check (
    outcome in (
      'revealed',
      'denied_missing',
      'denied_unavailable',
      'denied_self',
      'denied_rate_limit'
    )
  )
);

alter table public.donor_contact_reveal_audit enable row level security;

revoke all on public.donor_contact_reveal_audit from public, anon, authenticated;

create index if not exists donor_contact_reveal_audit_caller_time_idx
  on public.donor_contact_reveal_audit (caller_auth_user_id, attempted_at);

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
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_donor_id is null then
    raise exception 'Donor ID is required' using errcode = '22023';
  end if;

  -- Serialize requests from one caller so concurrent calls cannot bypass the
  -- rolling hourly limit.
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