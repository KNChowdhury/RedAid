-- LifelineBD PATCH 18: Public "Success Stories" feed of completed donations.
-- ----------------------------------------------------------------------------
-- donation_records itself is properly locked down (donation_records_select
-- only lets you see rows you're the donor/recorder/requester of, or admin/
-- hospital) — exactly as it should be, per patch_11's forgery-hole fix. A
-- public "who donated for whom" feed needs its own view exposing only
-- non-sensitive fields (donor name, blood group — both already shown
-- publicly elsewhere in this app, e.g. donor cards) for CREDITED donations
-- only. Nothing here exposes phone, email, or health data.
--
-- IMPORTANT: this view is deliberately created WITHOUT security_invoker, so
-- it runs as its owner and bypasses donation_records'/donors' RLS — that is
-- the entire point (a public feed can't be gated by "is this your own row").
-- This is the exact same pattern as v_donors_directory (patch_03). Do NOT
-- "fix" this by adding security_invoker = true in response to a Security
-- Advisor warning — that flipped v_donors_directory from
-- "public directory, safe by column selection" to "respects RLS, shows only
-- your own row" earlier, breaking the Network page for everyone. The same
-- change here would make this view show nothing to anyone but the donor
-- themselves, defeating its purpose.
-- ============================================================================

drop view if exists public.v_completed_donations;
create view public.v_completed_donations as
select
  dr.id as donation_id,
  dr.request_id,
  dr.patient_name,
  dr.hospital_name,
  dr.units,
  dr.date as donated_date,
  d.name as donor_name,
  d.blood_group,
  r.district,
  r.area
from public.donation_records dr
join public.donors d on d.id = dr.donor_id
left join public.requests r on r.id = dr.request_id
where dr.credited = true
order by dr.date desc;

grant select on public.v_completed_donations to anon, authenticated;
