-- patch_33: donor phone numbers beyond the first need a blood request, and a
-- request can only be closed (never deleted) by the person who posted it.
--
-- Product rules (2026-10-28):
--   1. Without a request, a user may reveal ONE donor's number (lifetime,
--      counted as distinct donors in donor_contact_reveal_audit).
--   2. With an open request (status <> 'Fulfilled') that is at most 7 days
--      old, the user may reveal more numbers (existing hourly/daily caps
--      from patch_31 still apply).
--   3. An open request older than 7 days no longer unlocks numbers: the user
--      must close it first, then post a new one.
--   4. A request is closed in one of two ways, both via RPC:
--        close_request_with_donor(request, phone) -> records the donation
--          through the existing record_donation() flow (the donor confirms
--          and is credited by confirm_my_donation(), so there is still only
--          ONE crediting path), closed_reason = 'donor'.
--        close_request_managed(request) -> closed_reason = 'managed'
--          (blood arranged elsewhere, shown as "Managed").
--   5. Requesters cannot delete requests (admins still can, for spam), and
--      cannot set status/closed_reason by a direct table update.
--   6. A requester can have only one open request at a time.
--   Hospitals and admins are exempt from 1-3 and 6.
--
-- Status stays 'Fulfilled' for both close paths so every existing feed and
-- filter (status <> 'Fulfilled') keeps working; closed_reason tells them
-- apart. Idempotent: re-runnable.

begin;

-- 1. Columns -----------------------------------------------------------------
alter table public.requests add column if not exists closed_reason text;
alter table public.requests add column if not exists closed_at timestamptz;

alter table public.requests drop constraint if exists requests_closed_reason_check;
alter table public.requests add constraint requests_closed_reason_check
  check (closed_reason is null or closed_reason in ('donor', 'managed'));

-- 2. Audit outcomes ------------------------------------------------------------
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
      'denied_weekly_limit',
      'denied_request_required',
      'denied_stale_request'
    )
  );

-- 3. No deletes by requesters ------------------------------------------------------
drop policy if exists "requests_delete_owner_or_admin" on public.requests;
drop policy if exists "requests_delete_admin" on public.requests;
create policy "requests_delete_admin" on public.requests
  for delete to authenticated
  using ((select public.is_admin()));

-- 4. Status can only change through RPCs -------------------------------------------
-- Direct client updates run as role "authenticated"; security definer RPCs
-- (close_request_*, confirm_my_donation, verify_donation) run as the owner,
-- so they pass.
create or replace function public.guard_request_status_change()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user in ('authenticated', 'anon')
     and not public.is_admin()
     and (new.status is distinct from old.status
          or new.closed_reason is distinct from old.closed_reason
          or new.closed_at is distinct from old.closed_at) then
    raise exception 'Close a request with "Blood received" instead of changing its status'
      using errcode = '42501';
  end if;
  return new;
end;
$function$;

drop trigger if exists requests_guard_status_change on public.requests;
create trigger requests_guard_status_change
  before update on public.requests
  for each row execute function public.guard_request_status_change();

-- 5. One open request per requester ---------------------------------------------
create or replace function public.guard_one_open_request()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  requester_role text;
begin
  select role into requester_role from public.donors where id = new.requester_id;
  if public.is_admin() or requester_role = 'hospital' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtextextended('open_request:' || new.requester_id::text, 0));

  if exists (
    select 1 from public.requests r
    where r.requester_id = new.requester_id
      and r.status <> 'Fulfilled'
  ) then
    raise exception 'OPEN_REQUEST_EXISTS' using errcode = 'P0001',
      hint = 'Close your previous request before posting a new one.';
  end if;
  return new;
end;
$function$;

revoke all on function public.guard_one_open_request() from public, anon, authenticated;

drop trigger if exists requests_guard_one_open on public.requests;
create trigger requests_guard_one_open
  before insert on public.requests
  for each row execute function public.guard_one_open_request();

-- 6. get_donor_contact: request gate ----------------------------------------------
-- Same as patch_31, plus the request gate before the final reveal. Gate
-- denials RETURN (not raise) so their audit row is kept and the client can
-- tell the user what to do: {"error": "request_required" | "close_previous_request"}.
create or replace function public.get_donor_contact(p_donor_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  caller_id uuid := auth.uid();
  caller_donor_id uuid;
  caller_role text;
  donor_auth_user_id uuid;
  donor_available boolean;
  donor_phone text;
  donor_whatsapp text;
  hourly_attempts integer;
  daily_attempts integer;
  open_request_created timestamptz;
  has_open_request boolean;
  revealed_before integer;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_donor_id is null then
    raise exception 'Donor ID is required' using errcode = '22023';
  end if;

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

  -- Request gate (hospitals and admins exempt).
  select d.id, d.role into caller_donor_id, caller_role
  from public.donors d
  where d.auth_user_id = caller_id;

  if not (public.is_admin() or caller_role = 'hospital') then
    select max(r.created_at) into open_request_created
    from public.requests r
    where r.requester_id = caller_donor_id
      and r.status <> 'Fulfilled';
    has_open_request := open_request_created is not null;

    if not (has_open_request and open_request_created >= now() - interval '7 days') then
      -- Re-showing a donor already revealed is always allowed.
      if not exists (
        select 1 from public.donor_contact_reveal_audit a
        where a.caller_auth_user_id = caller_id
          and a.donor_id = p_donor_id
          and a.outcome = 'revealed'
      ) then
        select count(distinct a.donor_id)::integer into revealed_before
        from public.donor_contact_reveal_audit a
        where a.caller_auth_user_id = caller_id
          and a.outcome = 'revealed'
          -- Only reveals after this patch count, so earlier usage does not lock people out.
          and a.attempted_at >= timestamptz '2026-10-28 00:00:00+06';

        if has_open_request then
          insert into public.donor_contact_reveal_audit (
            caller_auth_user_id, donor_id, outcome
          ) values (caller_id, p_donor_id, 'denied_stale_request');
          return jsonb_build_object('error', 'close_previous_request');
        end if;

        if revealed_before >= 1 then
          insert into public.donor_contact_reveal_audit (
            caller_auth_user_id, donor_id, outcome
          ) values (caller_id, p_donor_id, 'denied_request_required');
          return jsonb_build_object('error', 'request_required');
        end if;
      end if;
    end if;
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

-- 7. Close with the donor (picked from the list, or typed phone number) -----
-- The phone matches on the last 10 digits so 01XXXXXXXXX, +8801XXXXXXXXX and
-- 8801XXXXXXXXX all find the same donor.
drop function if exists public.close_request_with_donor(uuid, text, integer);
create or replace function public.close_request_with_donor(
  p_request_id uuid,
  p_donor_id uuid default null,
  p_donor_phone text default null,
  p_units integer default 1
)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  me uuid := public.current_donor_id();
  req public.requests;
  wanted text := right(regexp_replace(coalesce(p_donor_phone, ''), '\D', '', 'g'), 10);
  match_count integer;
  donor_id uuid;
begin
  if me is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into req from public.requests where id = p_request_id for update;
  if not found or req.requester_id is distinct from me then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if req.status = 'Fulfilled' then
    raise exception 'REQUEST_ALREADY_CLOSED' using errcode = 'P0001';
  end if;
  if p_donor_id is not null then
    if not exists (select 1 from public.donors d where d.id = p_donor_id) then
      raise exception 'DONOR_NOT_FOUND' using errcode = 'P0001';
    end if;
    donor_id := p_donor_id;
  else
    if length(wanted) <> 10 then
      raise exception 'INVALID_PHONE' using errcode = '22023';
    end if;

    select count(*)::integer, min(d.id::text)::uuid into match_count, donor_id
    from public.donors d
    where right(regexp_replace(coalesce(d.phone, ''), '\D', '', 'g'), 10) = wanted;

    if match_count = 0 then
      raise exception 'DONOR_NOT_FOUND' using errcode = 'P0001';
    end if;
    if match_count > 1 then
      raise exception 'DONOR_PHONE_AMBIGUOUS' using errcode = 'P0001';
    end if;
  end if;
  if donor_id = me then
    raise exception 'CANNOT_SELF' using errcode = 'P0001';
  end if;

  -- Existing flow: pending record + notification; the donor confirms and
  -- confirm_my_donation() credits points exactly once (patch_32 guards).
  perform public.record_donation(p_request_id, donor_id, greatest(coalesce(p_units, 1), 1));

  update public.requests
  set status = 'Fulfilled', closed_reason = 'donor', closed_at = now()
  where id = p_request_id;

  return jsonb_build_object('status', 'donor');
end;
$function$;

revoke all on function public.close_request_with_donor(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.close_request_with_donor(uuid, uuid, text, integer) to authenticated;

-- 8. Close as managed elsewhere -------------------------------------------------------
create or replace function public.close_request_managed(p_request_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  me uuid := public.current_donor_id();
  req public.requests;
begin
  if me is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into req from public.requests where id = p_request_id for update;
  if not found or req.requester_id is distinct from me then
    raise exception 'REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if req.status = 'Fulfilled' then
    raise exception 'REQUEST_ALREADY_CLOSED' using errcode = 'P0001';
  end if;

  update public.requests
  set status = 'Fulfilled', closed_reason = 'managed', closed_at = now()
  where id = p_request_id;

  return jsonb_build_object('status', 'managed');
end;
$function$;

revoke all on function public.close_request_managed(uuid) from public, anon, authenticated;
grant execute on function public.close_request_managed(uuid) to authenticated;

commit;
