-- LifelineBD PATCH 20: Replace SECURITY DEFINER public feeds with safe tables.
-- ----------------------------------------------------------------------------
-- SECURITY DEFINER views over donors/donation_records bypass the querying
-- user's RLS. Replacing them with invoker views over projection tables keeps
-- public feeds available without exposing the private source tables.
--
-- Run after patch_17 and patch_18. This migration is rerunnable.
-- ============================================================================

-- ---------- Safe donor directory projection ----------
create table if not exists public.donor_directory_public (
  id uuid primary key,
  name text not null,
  avatar text,
  role text,
  blood_group text,
  birth_year integer,
  district text,
  area text,
  lat double precision,
  lng double precision,
  last_donation_date date,
  next_eligible_date date,
  is_smoker boolean,
  is_regular boolean,
  is_verified boolean,
  available_now boolean,
  impact_score integer,
  lives_saved integer,
  created_at timestamptz
);

alter table public.donor_directory_public enable row level security;
drop policy if exists donor_directory_public_select on public.donor_directory_public;
create policy donor_directory_public_select on public.donor_directory_public
  for select to anon, authenticated
  using (true);
revoke all on public.donor_directory_public from public, anon, authenticated;
grant select on public.donor_directory_public to anon, authenticated;

create or replace function public.sync_donor_directory_public()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.donor_directory_public where id = old.id;
    return old;
  end if;

  insert into public.donor_directory_public (
    id, name, avatar, role, blood_group, birth_year, district, area,
    lat, lng, last_donation_date, next_eligible_date, is_smoker,
    is_regular, is_verified, available_now, impact_score, lives_saved, created_at
  ) values (
    new.id, new.name, new.avatar, new.role, new.blood_group, new.birth_year,
    new.district, new.area, new.lat, new.lng, new.last_donation_date,
    new.next_eligible_date, new.is_smoker, new.is_regular, new.is_verified,
    new.available_now, new.impact_score, new.lives_saved, new.created_at
  )
  on conflict (id) do update set
    name = excluded.name,
    avatar = excluded.avatar,
    role = excluded.role,
    blood_group = excluded.blood_group,
    birth_year = excluded.birth_year,
    district = excluded.district,
    area = excluded.area,
    lat = excluded.lat,
    lng = excluded.lng,
    last_donation_date = excluded.last_donation_date,
    next_eligible_date = excluded.next_eligible_date,
    is_smoker = excluded.is_smoker,
    is_regular = excluded.is_regular,
    is_verified = excluded.is_verified,
    available_now = excluded.available_now,
    impact_score = excluded.impact_score,
    lives_saved = excluded.lives_saved,
    created_at = excluded.created_at;
  return new;
end;
$$;

revoke execute on function public.sync_donor_directory_public() from public, anon, authenticated;
drop trigger if exists donors_sync_public_directory on public.donors;
create trigger donors_sync_public_directory
after insert or update or delete on public.donors
for each row execute function public.sync_donor_directory_public();

insert into public.donor_directory_public (
  id, name, avatar, role, blood_group, birth_year, district, area,
  lat, lng, last_donation_date, next_eligible_date, is_smoker,
  is_regular, is_verified, available_now, impact_score, lives_saved, created_at
)
select
  id, name, avatar, role, blood_group, birth_year, district, area,
  lat, lng, last_donation_date, next_eligible_date, is_smoker,
  is_regular, is_verified, available_now, impact_score, lives_saved, created_at
from public.donors
on conflict (id) do update set
  name = excluded.name,
  avatar = excluded.avatar,
  role = excluded.role,
  blood_group = excluded.blood_group,
  birth_year = excluded.birth_year,
  district = excluded.district,
  area = excluded.area,
  lat = excluded.lat,
  lng = excluded.lng,
  last_donation_date = excluded.last_donation_date,
  next_eligible_date = excluded.next_eligible_date,
  is_smoker = excluded.is_smoker,
  is_regular = excluded.is_regular,
  is_verified = excluded.is_verified,
  available_now = excluded.available_now,
  impact_score = excluded.impact_score,
  lives_saved = excluded.lives_saved,
  created_at = excluded.created_at;

drop view if exists public.v_donors_directory;
create view public.v_donors_directory
with (security_invoker = true)
as
select * from public.donor_directory_public;
grant select on public.v_donors_directory to authenticated;

drop view if exists public.v_public_donors;
create view public.v_public_donors
with (security_invoker = true)
as
select * from public.donor_directory_public;
grant select on public.v_public_donors to anon, authenticated;

-- ---------- Safe completed-donation projection ----------
create table if not exists public.completed_donation_feed (
  donation_id uuid primary key,
  request_id uuid,
  patient_name text,
  hospital_name text,
  units integer,
  donated_date date,
  donor_name text,
  blood_group text,
  district text,
  area text
);

alter table public.completed_donation_feed enable row level security;
drop policy if exists completed_donation_feed_select on public.completed_donation_feed;
create policy completed_donation_feed_select on public.completed_donation_feed
  for select to anon, authenticated
  using (true);
revoke all on public.completed_donation_feed from public, anon, authenticated;
grant select on public.completed_donation_feed to anon, authenticated;

create or replace function public.sync_completed_donation_feed_row()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.completed_donation_feed where donation_id = old.id;
    return old;
  end if;

  if not new.credited then
    delete from public.completed_donation_feed where donation_id = new.id;
    return new;
  end if;

  insert into public.completed_donation_feed (
    donation_id, request_id, patient_name, hospital_name, units,
    donated_date, donor_name, blood_group, district, area
  )
  select
    dr.id, dr.request_id, dr.patient_name, dr.hospital_name, dr.units,
    dr.date, d.name, d.blood_group, r.district, r.area
  from public.donation_records dr
  join public.donors d on d.id = dr.donor_id
  left join public.requests r on r.id = dr.request_id
  where dr.id = new.id and dr.credited = true
  on conflict (donation_id) do update set
    request_id = excluded.request_id,
    patient_name = excluded.patient_name,
    hospital_name = excluded.hospital_name,
    units = excluded.units,
    donated_date = excluded.donated_date,
    donor_name = excluded.donor_name,
    blood_group = excluded.blood_group,
    district = excluded.district,
    area = excluded.area;
  return new;
end;
$$;

revoke execute on function public.sync_completed_donation_feed_row() from public, anon, authenticated;
drop trigger if exists donation_records_sync_completed_feed on public.donation_records;
create trigger donation_records_sync_completed_feed
after insert or update or delete on public.donation_records
for each row execute function public.sync_completed_donation_feed_row();

create or replace function public.refresh_completed_feed_for_donor()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.completed_donation_feed f
  set donor_name = new.name,
      blood_group = new.blood_group
  where f.donation_id in (
    select dr.id from public.donation_records dr where dr.donor_id = new.id and dr.credited
  );
  return new;
end;
$$;

revoke execute on function public.refresh_completed_feed_for_donor() from public, anon, authenticated;
drop trigger if exists donors_refresh_completed_feed on public.donors;
create trigger donors_refresh_completed_feed
after update of name, blood_group on public.donors
for each row execute function public.refresh_completed_feed_for_donor();

create or replace function public.refresh_completed_feed_for_request()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.completed_donation_feed f
  set district = new.district,
      area = new.area
  where f.request_id = new.id;
  return new;
end;
$$;

revoke execute on function public.refresh_completed_feed_for_request() from public, anon, authenticated;
drop trigger if exists requests_refresh_completed_feed on public.requests;
create trigger requests_refresh_completed_feed
after update of district, area on public.requests
for each row execute function public.refresh_completed_feed_for_request();

insert into public.completed_donation_feed (
  donation_id, request_id, patient_name, hospital_name, units,
  donated_date, donor_name, blood_group, district, area
)
select
  dr.id, dr.request_id, dr.patient_name, dr.hospital_name, dr.units,
  dr.date, d.name, d.blood_group, r.district, r.area
from public.donation_records dr
join public.donors d on d.id = dr.donor_id
left join public.requests r on r.id = dr.request_id
where dr.credited = true
on conflict (donation_id) do update set
  request_id = excluded.request_id,
  patient_name = excluded.patient_name,
  hospital_name = excluded.hospital_name,
  units = excluded.units,
  donated_date = excluded.donated_date,
  donor_name = excluded.donor_name,
  blood_group = excluded.blood_group,
  district = excluded.district,
  area = excluded.area;

drop view if exists public.v_completed_donations;
create view public.v_completed_donations
with (security_invoker = true)
as
select * from public.completed_donation_feed;
grant select on public.v_completed_donations to anon, authenticated;

-- Verify these views are now invoker views.
select c.relname, c.reloptions
from pg_class c
where c.relname in ('v_donors_directory', 'v_public_donors', 'v_completed_donations');
