-- LifelineBD PATCH 06: Match record_donation with donation_records status constraint.
-- Run in Supabase SQL Editor after the app is deployed.

create or replace function public.record_donation(p_request_id uuid, p_donor_id uuid, p_units integer default 1)
returns public.donation_records
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
  returning * into rec;

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
