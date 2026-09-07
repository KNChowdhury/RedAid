-- LifelineBD PATCH 26: remove smoker status from public donor projections.
-- Run after patch_25_public_data_privacy.sql. This is rerunnable.
-- Incident note: the public directory retained is_smoker from the earlier
-- projection even though health information must remain donor-private.

-- Drop dependent views before removing the projection column.
drop view if exists public.v_donors_directory;
drop view if exists public.v_public_donors;

alter table public.donor_directory_public
  drop column if exists is_smoker;

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
    last_donation_date, next_eligible_date, is_regular, is_verified,
    available_now, impact_score, lives_saved, created_at
  ) values (
    new.id, new.name, new.avatar, new.role, new.blood_group, new.birth_year,
    new.district, new.area, new.last_donation_date, new.next_eligible_date,
    new.is_regular, new.is_verified, new.available_now, new.impact_score,
    new.lives_saved, new.created_at
  )
  on conflict (id) do update set
    name = excluded.name, avatar = excluded.avatar, role = excluded.role,
    blood_group = excluded.blood_group, birth_year = excluded.birth_year,
    district = excluded.district, area = excluded.area,
    last_donation_date = excluded.last_donation_date,
    next_eligible_date = excluded.next_eligible_date,
    is_regular = excluded.is_regular, is_verified = excluded.is_verified,
    available_now = excluded.available_now, impact_score = excluded.impact_score,
    lives_saved = excluded.lives_saved, created_at = excluded.created_at;
  return new;
end;
$$;

revoke execute on function public.sync_donor_directory_public() from public, anon, authenticated;

create view public.v_public_donors with (security_invoker = true)
as select
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_regular, is_verified,
  available_now, impact_score, lives_saved, created_at
from public.donor_directory_public;
grant select on public.v_public_donors to anon, authenticated;

create view public.v_donors_directory with (security_invoker = true)
as select
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_regular, is_verified,
  available_now, impact_score, lives_saved, created_at
from public.donor_directory_public;
grant select on public.v_donors_directory to authenticated;

-- Verify both the table and public views no longer expose smoker status.
select
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'donor_directory_public'
      and column_name = 'is_smoker'
  ) as directory_has_smoker_column,
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'v_public_donors'
      and column_name = 'is_smoker'
  ) as public_view_has_smoker_column;
