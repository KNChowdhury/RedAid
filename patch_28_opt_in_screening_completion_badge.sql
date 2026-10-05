-- LifelineBD PATCH 28: allow donors to opt in to a public screening-completion badge.
-- Run after patch_26_remove_public_smoker_status.sql.
-- Only a consented boolean is projected publicly; screening results stay private.

begin;

alter table public.donors
  add column if not exists share_screening_completion boolean not null default false;

alter table public.donor_directory_public
  add column if not exists screening_completion_public boolean not null default false;

create or replace function public.sync_donor_directory_public()
returns trigger
language plpgsql
security definer
set search_path to 'public, pg_temp'
as $$
declare
  v_screening_completion_public boolean;
begin
  if tg_op = 'DELETE' then
    delete from public.donor_directory_public where id = old.id;
    return old;
  end if;

  select
    new.share_screening_completion
    and h.hbsag_status = 'Negative'
    and h.hcv_status = 'Negative'
    and h.hiv_status = 'Negative'
    and h.syphilis_status = 'Negative'
    and h.malaria_status = 'Negative'
  into v_screening_completion_public
  from public.donor_health h
  where h.donor_id = new.id;

  insert into public.donor_directory_public (
    id, name, avatar, role, blood_group, birth_year, district, area,
    last_donation_date, next_eligible_date, is_regular, is_verified,
    available_now, impact_score, lives_saved, created_at,
    screening_completion_public
  ) values (
    new.id, new.name, new.avatar, new.role, new.blood_group, new.birth_year,
    new.district, new.area, new.last_donation_date, new.next_eligible_date,
    new.is_regular, new.is_verified, new.available_now, new.impact_score,
    new.lives_saved, new.created_at, coalesce(v_screening_completion_public, false)
  )
  on conflict (id) do update set
    name = excluded.name, avatar = excluded.avatar, role = excluded.role,
    blood_group = excluded.blood_group, birth_year = excluded.birth_year,
    district = excluded.district, area = excluded.area,
    last_donation_date = excluded.last_donation_date,
    next_eligible_date = excluded.next_eligible_date,
    is_regular = excluded.is_regular, is_verified = excluded.is_verified,
    available_now = excluded.available_now, impact_score = excluded.impact_score,
    lives_saved = excluded.lives_saved, created_at = excluded.created_at,
    screening_completion_public = excluded.screening_completion_public;
  return new;
end;
$$;

revoke execute on function public.sync_donor_directory_public() from public, anon, authenticated;

create or replace function public.sync_public_screening_completion()
returns trigger
language plpgsql
security definer
set search_path to 'public, pg_temp'
as $$
declare
  v_donor_id uuid;
begin
  v_donor_id := coalesce(new.donor_id, old.donor_id);

  update public.donor_directory_public p
  set screening_completion_public = exists (
    select 1
    from public.donors d
    join public.donor_health h on h.donor_id = d.id
    where d.id = v_donor_id
      and d.share_screening_completion
      and h.hbsag_status = 'Negative'
      and h.hcv_status = 'Negative'
      and h.hiv_status = 'Negative'
      and h.syphilis_status = 'Negative'
      and h.malaria_status = 'Negative'
  )
  where p.id = v_donor_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.sync_public_screening_completion() from public, anon, authenticated;

drop trigger if exists donor_health_sync_screening_completion on public.donor_health;
create trigger donor_health_sync_screening_completion
after insert or update or delete on public.donor_health
for each row execute function public.sync_public_screening_completion();

update public.donor_directory_public p
set screening_completion_public = exists (
  select 1
  from public.donors d
  join public.donor_health h on h.donor_id = d.id
  where d.id = p.id
    and d.share_screening_completion
    and h.hbsag_status = 'Negative'
    and h.hcv_status = 'Negative'
    and h.hiv_status = 'Negative'
    and h.syphilis_status = 'Negative'
    and h.malaria_status = 'Negative'
);

drop view if exists public.v_donors_directory;
drop view if exists public.v_public_donors;

create view public.v_public_donors with (security_invoker = true)
as select
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_regular, is_verified,
  available_now, impact_score, lives_saved, created_at,
  screening_completion_public
from public.donor_directory_public;
grant select on public.v_public_donors to anon, authenticated;

create view public.v_donors_directory with (security_invoker = true)
as select
  id, name, avatar, role, blood_group, birth_year, district, area,
  last_donation_date, next_eligible_date, is_regular, is_verified,
  available_now, impact_score, lives_saved, created_at,
  screening_completion_public
from public.donor_directory_public;
grant select on public.v_donors_directory to authenticated;

commit;

-- Verify the public projection contains only the opt-in completion boolean.
select
  column_name
from information_schema.columns
where table_schema = 'public'
  and table_name = 'v_public_donors'
  and column_name like '%screening%';

-- Exercise the public view as anon without returning donor identities.
begin;
set local role anon;
select
  count(*) as public_donor_count,
  count(*) filter (where screening_completion_public) as opted_in_and_complete_count
from public.v_public_donors;
rollback;
