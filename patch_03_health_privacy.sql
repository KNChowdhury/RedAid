-- ============================================================================
-- LifelineBD — PATCH 03: Health data privacy
-- ----------------------------------------------------------------------------
-- PROBLEM: HIV / HCV / HBsAg / Syphilis / Malaria results, hemoglobin, blood
-- pressure and weight all live on public.donors, and donors_select lets ANY
-- signed-in user read every row. So one account could read every donor's
-- medical test results.
--
-- FIX: move those fields into public.donor_health, readable only by the donor
-- themselves (and admins). The donors table keeps only non-sensitive fields.
--
-- Existing data is copied over, not lost. Safe to run more than once.
-- ============================================================================

-- ============================================================================
-- 1. New private health table
-- ============================================================================

create table if not exists public.donor_health (
  donor_id            uuid primary key references public.donors(id) on delete cascade,

  -- vitals
  weight_kg           numeric(5,2) default 0,
  blood_pressure      text default '',
  hemoglobin          numeric(4,2) default 0,
  has_chronic_disease boolean not null default false,
  recent_medication   text default '',

  -- mandatory TTI screening
  hbsag_status        text default 'Not Tested',
  hcv_status          text default 'Not Tested',
  hiv_status          text default 'Not Tested',
  syphilis_status     text default 'Not Tested',
  malaria_status      text default 'Not Tested',

  updated_at          timestamptz not null default now()
);

-- ============================================================================
-- 2. Copy existing health data across (only for donors not already migrated)
-- ============================================================================

insert into public.donor_health (
  donor_id, weight_kg, blood_pressure, hemoglobin, has_chronic_disease,
  recent_medication, hbsag_status, hcv_status, hiv_status, syphilis_status, malaria_status
)
select
  d.id,
  coalesce(d.weight_kg, 0),
  coalesce(d.blood_pressure, ''),
  coalesce(d.hemoglobin, 0),
  coalesce(d.has_chronic_disease, false),
  coalesce(d.recent_medication, ''),
  coalesce(d.hbsag_status, 'Not Tested'),
  coalesce(d.hcv_status, 'Not Tested'),
  coalesce(d.hiv_status, 'Not Tested'),
  coalesce(d.syphilis_status, 'Not Tested'),
  coalesce(d.malaria_status, 'Not Tested')
from public.donors d
where not exists (select 1 from public.donor_health h where h.donor_id = d.id);

-- Auto-create an empty health row for every future signup.
create or replace function public.create_donor_health_row()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.donor_health (donor_id) values (new.id)
  on conflict (donor_id) do nothing;
  return new;
end $$;

drop trigger if exists donors_create_health on public.donors;
create trigger donors_create_health after insert on public.donors
  for each row execute function public.create_donor_health_row();

-- keep updated_at fresh
drop trigger if exists donor_health_touch on public.donor_health;
create trigger donor_health_touch before update on public.donor_health
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- 3. RLS — owner only (plus admins)
-- ============================================================================

alter table public.donor_health enable row level security;

drop policy if exists donor_health_own on public.donor_health;
create policy donor_health_own on public.donor_health
  for all to authenticated
  using (donor_id = public.current_donor_id())
  with check (donor_id = public.current_donor_id());

drop policy if exists donor_health_admin on public.donor_health;
create policy donor_health_admin on public.donor_health
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- 4. Directory view for signed-in users — everything EXCEPT health data
--    The app reads the donor list from here, so no client can request the
--    health columns at all, even by crafting its own query.
-- ============================================================================

drop view if exists public.v_donors_directory;
create view public.v_donors_directory as
select
  id, auth_user_id, name, avatar, role,
  blood_group, district, area, lat, lng,
  last_donation_date, next_eligible_date,
  is_smoker, is_regular, is_verified, available_now,
  impact_score, lives_saved, created_at
from public.donors;

grant select on public.v_donors_directory to authenticated;

-- ============================================================================
-- 5. Lock the donors table down to own-row reads
--    Nobody can read another donor's raw row (which still physically holds the
--    old health columns until step 6 drops them).
-- ============================================================================

drop policy if exists donors_select on public.donors;
create policy donors_select_own on public.donors
  for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- 6. Drop the duplicated + now-migrated health columns from donors
--    Run this ONLY after the new app code is deployed and you've confirmed
--    profiles still load. Uncomment, then run.
-- ============================================================================

-- alter table public.donors
--   drop column if exists weight_kg,
--   drop column if exists blood_pressure,
--   drop column if exists hemoglobin,
--   drop column if exists has_chronic_disease,
--   drop column if exists recent_medication,
--   drop column if exists hbsag_status,
--   drop column if exists hcv_status,
--   drop column if exists hiv_status,
--   drop column if exists syphilis_status,
--   drop column if exists malaria_status,
--   drop column if exists anti_hcv_status,
--   drop column if exists anti_hiv_status,
--   drop column if exists vdrl_status,
--   drop column if exists mp_status;

-- ============================================================================
-- Verify:
--   select count(*) from public.donor_health;          -- one row per donor
--   select * from public.v_donors_directory limit 5;   -- no health columns
-- ============================================================================
