-- Inspect duplicate rows in public.completed_donation_feed (the table backing
-- the public "Success Stories" page via the v_completed_donations view).
-- Read-only. Safe to run more than once.

select
  id,
  donation_id,
  donor_name,
  patient_name,
  hospital,
  district,
  area,
  donated_at,
  created_at
from public.completed_donation_feed
where donor_name = 'beyourbestbd'
order by hospital, donated_at, id;

-- Grouped view: any group with count > 1 is a duplicate to review.
select
  donor_name,
  hospital,
  donated_at,
  count(*) as row_count,
  array_agg(id order by id) as row_ids,
  array_agg(donation_id order by id) as donation_ids
from public.completed_donation_feed
group by donor_name, hospital, donated_at
having count(*) > 1
order by donor_name, hospital;
