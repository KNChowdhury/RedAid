-- LifelineBD PATCH 27: restore request_directory_public's grants/views.
-- Run standalone. This migration is rerunnable.
--
-- Incident: patch_25_public_data_privacy.sql's donor-directory section
-- references donor_directory_public.is_smoker, which patch_26 later dropped.
-- Re-running patch_25 in full (to try to fix an unrelated grants problem)
-- failed partway through with "column is_smoker does not exist" -- and since
-- the SQL Editor commits each statement as it runs (no transaction wrapper in
-- that script), everything after the failure point never executed, including
-- the entire request-feed section below. Confirmed live via a direct anon-key
-- probe: request_directory_public had no SELECT grant for anon at all,
-- meaning the live app's request feed was broken for every guest and
-- signed-in user. This patch is exactly patch_25's request-feed section,
-- lines 118-243, copied verbatim -- nothing here touches donor_directory_public
-- or is_smoker, so it can run standalone without hitting that column.
--
-- PREVENTION: patch_25 should have been split into independent
-- donor-projection and request-projection patches from the start, so a
-- failure in one section can never silently skip an unrelated one. Treat this
-- as the model going forward -- one patch, one concern.

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

-- Verification: anon/authenticated must both be able to read the request
-- feed views; anon must NOT be able to read the base requests table directly.
select
  has_table_privilege('anon', 'public.request_directory_public', 'SELECT') as anon_can_read_request_directory,
  has_table_privilege('authenticated', 'public.request_directory_public', 'SELECT') as authenticated_can_read_request_directory,
  has_table_privilege('anon', 'public.v_public_requests', 'SELECT') as anon_can_read_v_public_requests,
  has_table_privilege('anon', 'public.requests', 'SELECT') as anon_can_read_requests_base_table;
