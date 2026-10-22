-- patch_31: tighten get_donor_contact() against phone-number scraping.
--
-- Context: phone numbers are only readable through this RPC (anon cannot
-- read donors; donor_directory_public has no phone column; authenticated
-- users only see their own donors row). The only cap was 50 reveals per
-- rolling hour = 1,200/day, enough for one throwaway account to harvest
-- every available donor's number in a day (~1,000 imported 2026-10).
--
-- Real usage (donor_contact_reveal_audit, 2026-10-23): max 28 reveals by one
-- user in a day, p95 20. New limits: 15 per rolling hour AND 40 per rolling
-- 24 hours. Denied attempts count too, so probing is not free.
-- Body otherwise unchanged from production. Idempotent: create or replace.

create or replace function public.get_donor_contact(p_donor_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  caller_id uuid := auth.uid();
  donor_auth_user_id uuid;
  donor_available boolean;
  donor_phone text;
  donor_whatsapp text;
  hourly_attempts integer;
  daily_attempts integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_donor_id is null then
    raise exception 'Donor ID is required' using errcode = '22023';
  end if;

  -- Serialize requests from one caller so concurrent calls cannot bypass the
  -- rolling limits.
  perform pg_advisory_xact_lock(hashtextextended(caller_id::text, 0));

  select count(*) filter (where attempted_at >= now() - interval '1 hour')::integer,
         count(*)::integer
    into hourly_attempts, daily_attempts
  from public.donor_contact_reveal_audit
  where caller_auth_user_id = caller_id
    and attempted_at >= now() - interval '24 hours';

  if hourly_attempts >= 15 or daily_attempts >= 40 then
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
$function$;

revoke all on function public.get_donor_contact(uuid) from public, anon, authenticated;
grant execute on function public.get_donor_contact(uuid) to authenticated;
