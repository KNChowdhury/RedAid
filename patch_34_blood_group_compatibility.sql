-- patch_34: a donation can only be recorded/credited for a donor whose blood
-- group can actually be given to the request's patient.
--
-- INCIDENT (blameless): found 2026-10-28 while reviewing the "who donated"
-- flow. record_donation() (and close_request_with_donor(), which calls it)
-- accepted ANY donor for ANY request. A read-only check found 7 of 8
-- donation_records whose donor group differs from the request group; 3 of
-- them are credited and medically impossible as recorded (O+ donor for O-
-- and A- patients, 2026-08-21), and 2 pending ones are also impossible
-- (A+ and B+ donors for O+ patients, 2026-10-28). One pending pair (B- for
-- B+) is valid. Nothing stopped a requester picking the wrong person from
-- the search list, or naming a friend to hand out points.
--
-- Rule: standard red-cell compatibility, not exact match, because exact
-- match would reject real donations (O- gives to everyone; B- to B+).
--   ABO: O -> any; A -> A, AB; B -> B, AB; AB -> AB.
--   Rh:  a negative donor gives to anyone; a positive donor only to positive.
--
-- Enforced in all three crediting paths (defense in depth):
--   record_donation()      - blocks recording (also covers close_request_with_donor)
--   confirm_my_donation()  - blocks crediting old pending mismatched rows
--   verify_donation()      - hospital/admin path
-- Error text: BLOOD_GROUP_MISMATCH (mapped to a friendly message in the UI).
--
-- NOT done here: the 3 already-credited incompatible records are left as
-- they are. Reversing points needs a human decision (were they test data?),
-- and a reversal must mirror the full atomic change (impact_score,
-- lives_saved, last_donation_date, available_now), not just points.
--
-- Idempotent: create or replace only.

begin;

create or replace function public.blood_group_can_donate(p_donor text, p_recipient text)
returns boolean
language plpgsql
immutable
set search_path to 'public', 'pg_temp'
as $$
declare
  donor_abo text := rtrim(upper(trim(coalesce(p_donor, ''))), '+-');
  donor_rh  text := right(trim(coalesce(p_donor, '')), 1);
  recip_abo text := rtrim(upper(trim(coalesce(p_recipient, ''))), '+-');
  recip_rh  text := right(trim(coalesce(p_recipient, '')), 1);
  abo_ok boolean;
begin
  if donor_abo not in ('O', 'A', 'B', 'AB') or recip_abo not in ('O', 'A', 'B', 'AB')
     or donor_rh not in ('+', '-') or recip_rh not in ('+', '-') then
    return false;
  end if;

  if donor_abo = 'O' then
    abo_ok := true;
  elsif donor_abo = 'A' then
    abo_ok := recip_abo in ('A', 'AB');
  elsif donor_abo = 'B' then
    abo_ok := recip_abo in ('B', 'AB');
  else
    abo_ok := recip_abo = 'AB';
  end if;

  return abo_ok and (donor_rh = '-' or recip_rh = '+');
end;
$$;

revoke execute on function public.blood_group_can_donate(text, text) from public, anon, authenticated;

-- record_donation: unchanged except the compatibility check -----------------
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
  donor_group text;
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

  select d.blood_group into donor_group from public.donors d where d.id = p_donor_id;
  if not public.blood_group_can_donate(donor_group, req.blood_group) then
    raise exception 'BLOOD_GROUP_MISMATCH' using errcode = 'P0001';
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

-- confirm_my_donation: unchanged except the compatibility check -------------
create or replace function public.confirm_my_donation(p_donation_id uuid)
returns donation_records
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := public.current_donor_id();
  rec public.donation_records;
  donor_group text;
  request_group text;
begin
  select * into rec from public.donation_records where id = p_donation_id;
  if not found then
    raise exception 'Donation record not found';
  end if;

  if rec.donor_id <> me then
    raise exception 'You can only confirm your own donation';
  end if;

  -- Records not tied to a request have no patient group to check against.
  if rec.request_id is not null and not coalesce(rec.credited, false) then
    select d.blood_group into donor_group from public.donors d where d.id = me;
    select r.blood_group into request_group from public.requests r where r.id = rec.request_id;
    if not public.blood_group_can_donate(donor_group, request_group) then
      raise exception 'BLOOD_GROUP_MISMATCH' using errcode = 'P0001';
    end if;
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

-- verify_donation: unchanged except the compatibility check -----------------
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
  donor_group text;
begin
  select role into myrole from public.donors where id = me;

  if not (public.is_admin() or myrole = 'hospital') then
    raise exception 'Only hospital staff or admins can verify donations';
  end if;

  select * into req from public.requests where id = p_request_id;
  if not found then
    raise exception 'Request not found';
  end if;

  select d.blood_group into donor_group from public.donors d where d.id = p_donor_id;
  if not public.blood_group_can_donate(donor_group, req.blood_group) then
    raise exception 'BLOOD_GROUP_MISMATCH' using errcode = 'P0001';
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

commit;

-- Verify after running (expect: t, t, t, f, f, f):
-- select public.blood_group_can_donate('O-','AB+'), public.blood_group_can_donate('B-','B+'),
--        public.blood_group_can_donate('A+','A+'),  public.blood_group_can_donate('O+','O-'),
--        public.blood_group_can_donate('A+','O+'),  public.blood_group_can_donate('B+','O+');
