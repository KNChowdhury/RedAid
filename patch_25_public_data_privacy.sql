-- LifelineBD PATCH 25: safe public projections for requests and donor feeds.
-- Run after patch_20 and patch_21. This migration is rerunnable.
-- Public data must not contain personal contacts, patient names, or exact donor coordinates.

-- ---------- Donor directory: remove exact coordinates from public data ------
drop view if exists public.v_donors_directory;
drop view if exists public.v_public_donors;

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
    last_donation_date, next_eligible_date, is_smoker, is_regular,
    is_verified, available_now, impact_score, lives_saved, created_at
  ) values (
    new.id, new.name, new.avatar, new.role, new.blood_group, new.birth_year,
    new.district, new.area, new.last_donation_date, new.next_eligible_date,
    new.is_smoker, new.is_regular, new.is_verified, new.available_now,
    new.impact_score, new.lives_saved, new.created_at
  )
  on conflict (id) do update set
    name = excluded.name, avatar = excluded.avatar, role = excluded.role,
    blood_group = excluded.blood_group, birth_year = excluded.birth_year,
    district = excluded.district, area = excluded.area,
    last_donation_date = excluded.last_donation_date,
    next_eligible_date = excluded.next_eligible_date,
    is_smoker = excluded.is_smoker, is_regular = excluded.is_regular,
    is_verified = excluded.is_verified, available_now = excluded.available_now,
    impact_score = excluded.impact_score, lives_saved = excluded.lives_saved,
    created_at = excluded.created_at;
  return new;
end;
$$;

revoke execute on function public.sync_donor_directory_public() from public, anon, authenticated;
alter table public.donor_directory_public drop column if exists lat, drop column if exists lng;

insert into public.donor_directory_public (
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_smoker, is_regular,
  is_verified, available_now, impact_score, lives_saved, created_at
)
select
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_smoker, is_regular,
  is_verified, available_now, impact_score, lives_saved, created_at
from public.donors
on conflict (id) do update set
  name = excluded.name, avatar = excluded.avatar, role = excluded.role,
  blood_group = excluded.blood_group, birth_year = excluded.birth_year,
  district = excluded.district, area = excluded.area,
  last_donation_date = excluded.last_donation_date,
  next_eligible_date = excluded.next_eligible_date,
  is_smoker = excluded.is_smoker, is_regular = excluded.is_regular,
  is_verified = excluded.is_verified, available_now = excluded.available_now,
  impact_score = excluded.impact_score, lives_saved = excluded.lives_saved,
  created_at = excluded.created_at;

create view public.v_public_donors with (security_invoker = true)
as select * from public.donor_directory_public;
grant select on public.v_public_donors to anon, authenticated;

create view public.v_donors_directory with (security_invoker = true)
as select * from public.donor_directory_public;
grant select on public.v_donors_directory to authenticated;

-- ---------- Completed feed: never publish a real patient name --------------
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
    dr.id, dr.request_id, 'A patient', dr.hospital_name, dr.units,
    dr.date, d.name, d.blood_group, r.district, r.area
  from public.donation_records dr
  join public.donors d on d.id = dr.donor_id
  left join public.requests r on r.id = dr.request_id
  where dr.id = new.id
  on conflict (donation_id) do update set
    request_id = excluded.request_id, patient_name = 'A patient',
    hospital_name = excluded.hospital_name, units = excluded.units,
    donated_date = excluded.donated_date, donor_name = excluded.donor_name,
    blood_group = excluded.blood_group, district = excluded.district,
    area = excluded.area;
  return new;
end;
$$;

revoke execute on function public.sync_completed_donation_feed_row() from public, anon, authenticated;
update public.completed_donation_feed set patient_name = 'A patient';

-- ---------- Request feed: safe projection without contacts or names ---------
create table if not exists public.request_directory_public (
  id uuid primary key,
  patient_name text not null default 'A patient',
  age integer,
  blood_group text not null,
  hospital_name text not null,
  district text,
  area text,
  required_bags integer not null,
  needed_by_time text,
  needed_by_at timestamptz,
  urgency text not null,
  reason text not null default '',
  status text not null,
  requester_id uuid,
  matched_donors_count integer not null default 0,
  created_at timestamptz not null
);

alter table public.request_directory_public enable row level security;
revoke all on public.request_directory_public from public, anon, authenticated;
grant select (
  id, patient_name, age, blood_group, hospital_name, district, area,
  required_bags, needed_by_time, needed_by_at, urgency, reason, status,
  matched_donors_count, created_at
) on public.request_directory_public to anon, authenticated;
grant select (requester_id) on public.request_directory_public to authenticated;

drop policy if exists request_directory_public_select on public.request_directory_public;
create policy request_directory_public_select on public.request_directory_public
for select to anon, authenticated using (true);

create or replace function public.sync_request_directory_public()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if tg_op = 'DELETE' then
    delete from public.request_directory_public where id = old.id;
    return old;
  end if;

  insert into public.request_directory_public (
    id, patient_name, age, blood_group, hospital_name, district, area,
    required_bags, needed_by_time, needed_by_at, urgency, reason, status,
    requester_id, matched_donors_count, created_at
  ) values (
    new.id, 'A patient', null, new.blood_group, new.hospital_name,
    new.district, new.area, new.required_bags, new.needed_by_time,
    new.needed_by_at, new.urgency, '', new.status, new.requester_id,
    coalesce(new.matched_donors_count, 0), new.created_at
  )
  on conflict (id) do update set
    patient_name = 'A patient', age = null,
    blood_group = excluded.blood_group, hospital_name = excluded.hospital_name,
    district = excluded.district, area = excluded.area,
    required_bags = excluded.required_bags, needed_by_time = excluded.needed_by_time,
    needed_by_at = excluded.needed_by_at, urgency = excluded.urgency,
    reason = '', status = excluded.status, requester_id = excluded.requester_id,
    matched_donors_count = excluded.matched_donors_count,
    created_at = excluded.created_at;
  return new;
end;
$$;

revoke execute on function public.sync_request_directory_public() from public, anon, authenticated;
drop trigger if exists requests_sync_public_directory on public.requests;
create trigger requests_sync_public_directory
after insert or update or delete on public.requests
for each row execute function public.sync_request_directory_public();

insert into public.request_directory_public (
  id, patient_name, age, blood_group, hospital_name, district, area,
  required_bags, needed_by_time, needed_by_at, urgency, reason, status,
  requester_id, matched_donors_count, created_at
)
select
  id, 'A patient', null, blood_group, hospital_name, district, area,
  required_bags, needed_by_time, needed_by_at, urgency, '', status,
  requester_id, coalesce(matched_donors_count, 0), created_at
from public.requests
on conflict (id) do update set
  patient_name = 'A patient', age = null,
  blood_group = excluded.blood_group, hospital_name = excluded.hospital_name,
  district = excluded.district, area = excluded.area,
  required_bags = excluded.required_bags, needed_by_time = excluded.needed_by_time,
  needed_by_at = excluded.needed_by_at, urgency = excluded.urgency,
  reason = '', status = excluded.status, requester_id = excluded.requester_id,
  matched_donors_count = excluded.matched_donors_count,
  created_at = excluded.created_at;

drop view if exists public.v_public_requests;
drop view if exists public.v_authenticated_requests;

create view public.v_public_requests with (security_invoker = true)
as
select id, patient_name, age, blood_group, hospital_name, district, area,
  required_bags, needed_by_time, needed_by_at, urgency, reason, status,
  matched_donors_count, created_at
from public.request_directory_public;
grant select on public.v_public_requests to anon, authenticated;

create view public.v_authenticated_requests with (security_invoker = true)
as
select id, patient_name, age, blood_group, hospital_name, district, area,
  required_bags, needed_by_time, needed_by_at, urgency, reason, status,
  requester_id, matched_donors_count, created_at
from public.request_directory_public;
grant select on public.v_authenticated_requests to authenticated;

-- ---------- Base tables: no direct anonymous access -------------------------
revoke all on public.donors from public, anon;
revoke all on public.requests from public, anon;

drop policy if exists donors_insert_self on public.donors;
create policy donors_insert_self on public.donors
for insert to authenticated with check (auth_user_id = (select auth.uid()));

drop policy if exists requests_select on public.requests;
drop policy if exists requests_select_owner_or_admin on public.requests;
create policy requests_select_owner_or_admin on public.requests
for select to authenticated
using (requester_id = (select current_donor_id()) or (select is_admin()));

select
  has_table_privilege('anon', 'public.donors', 'SELECT') as anon_can_read_donors,
  has_table_privilege('anon', 'public.requests', 'SELECT') as anon_can_read_requests,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'donor_directory_public'
      and column_name in ('lat', 'lng')
  ) as public_directory_has_exact_coordinates;
