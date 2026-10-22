-- patch_32: one donation record per (request, donor); credit each record once.
--
-- INCIDENT (blameless): on 2026-08-21 one donor was credited twice for each
-- of two requests (92c06591…, 42e6c820…). Each request got two
-- donation_records rows 7-9 seconds apart: a double tap on "Record donation".
-- record_donation() had no duplicate guard, so it inserted twice, and the
-- donor then confirmed both rows (+150 points and +1 life each). Result:
-- 600 points / 4 lives for 2 real donations. An earlier manual fix
-- (2026-08-29) treated 600/4 as correct, so it did not catch this.
-- Caught in a 2026-10-23 code review that compared credited records per
-- (request, donor).
--
-- Prevention:
--   1. Unique index on donation_records(request_id, donor_id).
--   2. record_donation(): on conflict returns the existing record.
--   3. verify_donation(): reuses the existing record, credits only when it
--      moves credited false->true, requires the donor to have offered help,
--      and fulfils the request only when the confirmed units cover the bags.
--   4. confirm_my_donation(): claims the credit atomically
--      (update ... where not credited returning), closing a race between
--      two concurrent calls.
--
-- Data fix: removes the later duplicate of each pair and reverses that
-- credit on the donor (points, lives saved). last_donation_date and
-- available_now stay as they are (2026-08-21 / false), which the remaining
-- records still justify.
-- Idempotent: the second run deletes nothing and therefore subtracts
-- nothing.

begin;

-- 1. Data fix ---------------------------------------------------------------
do $$
declare
  r record;
begin
  create temp table patch32_removed (donor_id uuid, removed integer) on commit drop;
  with dupes as (
    select id, donor_id, credited,
           row_number() over (partition by request_id, donor_id order by created_at, id) as rn
    from public.donation_records
    where request_id is not null
  ), deleted as (
    delete from public.donation_records dr
    using dupes d
    where dr.id = d.id and d.rn > 1
    returning dr.donor_id, dr.credited
  )
  insert into patch32_removed
  select donor_id, count(*) filter (where credited)::integer
  from deleted
  group by donor_id;

  for r in select * from patch32_removed where removed > 0 loop
    update public.donors
    set impact_score = greatest(coalesce(impact_score, 0) - 150 * r.removed, 0),
        lives_saved  = greatest(coalesce(lives_saved, 0) - r.removed, 0)
    where id = r.donor_id;
    raise notice 'patch_32: reversed % duplicate credit(s)', r.removed;
  end loop;
end $$;

-- 2. Uniqueness --------------------------------------------------------------
create unique index if not exists donation_records_request_donor_uniq
  on public.donation_records (request_id, donor_id)
  where request_id is not null;

-- 3. record_donation ---------------------------------------------------------
create or replace function public.record_donation(p_request_id uuid, p_donor_id uuid, p_units integer default 1)
 returns donation_records
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  me uuid := public.current_donor_id();
  req public.requests;
  rec public.donation_records;
begin
  select * into req from public.requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if not (
    req.requester_id = me
    or public.is_admin()
    or exists (select 1 from public.donors d where d.id = me and d.role = 'hospital')
  ) then
    raise exception 'Only the person who posted this request can record a donation';
  end if;

  if p_donor_id = me then
    raise exception 'You cannot record yourself as the donor for your own request';
  end if;

  insert into public.donation_records (
    donor_id, request_id, hospital_name, patient_name, units, date, status,
    requester_confirmed, donor_confirmed, recorded_by, source
  ) values (
    p_donor_id, p_request_id, req.hospital_name, req.patient_name,
    greatest(p_units, 1), current_date, 'Pending Verification',
    true, false, me, 'requester'
  )
  on conflict (request_id, donor_id) where request_id is not null do nothing
  returning * into rec;

  -- Already recorded (double tap, or a second recorder): return it unchanged
  -- and do not notify again.
  if rec.id is null then
    select * into rec from public.donation_records
    where request_id = p_request_id and donor_id = p_donor_id;
    return rec;
  end if;

  insert into public.notifications (donor_id, title, message, type, related_request_id)
  values (
    p_donor_id,
    'Donation confirmation needed',
    'The requester says you donated for ' || req.patient_name || ' at '
      || req.hospital_name || '. Confirm to receive your Lifeline points.',
    'reminder',
    req.id
  );

  return rec;
end $function$;

-- 4. verify_donation ---------------------------------------------------------
create or replace function public.verify_donation(p_request_id uuid, p_donor_id uuid, p_units integer default 1)
 returns donation_records
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  req    public.requests;
  me     uuid := public.current_donor_id();
  myrole text;
  rec    public.donation_records;
begin
  select role into myrole from public.donors where id = me;

  if not (public.is_admin() or myrole = 'hospital') then
    raise exception 'Only hospital staff or admins can verify donations';
  end if;

  select * into req from public.requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  if not exists (
    select 1 from public.request_responses rr
    where rr.request_id = p_request_id and rr.donor_id = p_donor_id
  ) and not exists (
    select 1 from public.donation_records dr
    where dr.request_id = p_request_id and dr.donor_id = p_donor_id
  ) then
    raise exception 'This donor has not responded to this request';
  end if;

  -- Make sure exactly one record exists for (request, donor).
  insert into public.donation_records (
    donor_id, request_id, hospital_name, patient_name, units, date, status, credited
  ) values (
    p_donor_id, p_request_id, req.hospital_name, req.patient_name,
    greatest(p_units, 1), current_date, 'Pending Verification', false
  )
  on conflict (request_id, donor_id) where request_id is not null do nothing;

  -- Claim the credit atomically. No row back means it was already credited.
  update public.donation_records
  set status = 'verified',
      verified_by = me,
      verified_at = now(),
      requester_confirmed = true,
      donor_confirmed = true,
      credited = true
  where request_id = p_request_id
    and donor_id = p_donor_id
    and not coalesce(credited, false)
  returning * into rec;

  if rec.id is null then
    select * into rec from public.donation_records
    where request_id = p_request_id and donor_id = p_donor_id;
    return rec;
  end if;

  -- Credit the donor: +150 impact points, one more life saved, and reset the
  -- 120-day clock. The set_next_eligible trigger handles next_eligible_date.
  update public.donors
  set impact_score       = coalesce(impact_score, 0) + 150,
      lives_saved        = coalesce(lives_saved, 0) + 1,
      last_donation_date = rec.date,
      available_now      = false
  where id = p_donor_id;

  update public.requests r
  set status = 'Fulfilled'
  where r.id = p_request_id
    and r.status <> 'Fulfilled'
    and (
      select coalesce(sum(dr.units), 0)
      from public.donation_records dr
      where dr.request_id = r.id
        and dr.requester_confirmed
        and dr.donor_confirmed
    ) >= r.required_bags;

  insert into public.notifications (donor_id, title, message, type)
  values (
    p_donor_id,
    '🏆 Donation verified — thank you!',
    'Your donation at ' || req.hospital_name || ' has been verified. +150 Lifeline points.',
    'reward'
  );

  return rec;
end $function$;

-- 5. confirm_my_donation -----------------------------------------------------
create or replace function public.confirm_my_donation(p_donation_id uuid)
 returns donation_records
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  me uuid := public.current_donor_id();
  rec public.donation_records;
begin
  select * into rec from public.donation_records where id = p_donation_id;
  if not found then
    raise exception 'Donation record not found';
  end if;

  if rec.donor_id <> me then
    raise exception 'You can only confirm your own donation';
  end if;

  -- Atomic claim: only one concurrent call can flip credited to true.
  update public.donation_records
  set donor_confirmed = true,
      verified_at = now(),
      status = 'verified',
      credited = true
  where id = p_donation_id
    and donor_id = me
    and not coalesce(credited, false)
  returning * into rec;

  if not found then
    select * into rec from public.donation_records where id = p_donation_id;
    return rec;
  end if;

  update public.donors
  set impact_score = coalesce(impact_score, 0) + 150,
      lives_saved = coalesce(lives_saved, 0) + 1,
      last_donation_date = rec.date,
      available_now = false
  where id = me;

  update public.requests r
  set status = 'Fulfilled'
  where r.id = rec.request_id
    and r.status <> 'Fulfilled'
    and (
      select coalesce(sum(dr.units), 0)
      from public.donation_records dr
      where dr.request_id = r.id
        and dr.requester_confirmed
        and dr.donor_confirmed
    ) >= r.required_bags;

  insert into public.notifications (donor_id, title, message, type)
  values (
    me,
    'Donation confirmed - thank you!',
    'You earned 150 Lifeline points. You can donate again after 120 days.',
    'reward'
  );

  return rec;
end $function$;

revoke all on function public.record_donation(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.verify_donation(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.confirm_my_donation(uuid) from public, anon, authenticated;
grant execute on function public.record_donation(uuid, uuid, integer) to authenticated;
grant execute on function public.verify_donation(uuid, uuid, integer) to authenticated;
grant execute on function public.confirm_my_donation(uuid) to authenticated;

commit;
