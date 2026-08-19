-- ============================================================================
-- LifelineBD — PATCH 04: Auto-notify matching donors
-- ----------------------------------------------------------------------------
-- When someone posts an emergency request, every eligible donor whose blood
-- type can actually help gets a notification row instantly. Combined with the
-- realtime subscription already in the app, the alert appears on their screen
-- without a refresh.
--
-- This is also the hook point for SMS / WhatsApp later: the notifications
-- table becomes the single outbox an Edge Function can read from.
--
-- Safe to run more than once.
-- ============================================================================

-- ============================================================================
-- 1. Blood compatibility: which donor groups can give to this recipient
-- ============================================================================

create or replace function public.compatible_donor_groups(recipient text)
returns text[] language sql immutable as $$
  select case recipient
    when 'AB+' then array['A+','A-','B+','B-','AB+','AB-','O+','O-']
    when 'AB-' then array['AB-','A-','B-','O-']
    when 'A+'  then array['A+','A-','O+','O-']
    when 'A-'  then array['A-','O-']
    when 'B+'  then array['B+','B-','O+','O-']
    when 'B-'  then array['B-','O-']
    when 'O+'  then array['O+','O-']
    when 'O-'  then array['O-']
    else array[]::text[]
  end;
$$;

-- ============================================================================
-- 2. Outbox columns on notifications (for SMS/WhatsApp delivery tracking)
-- ============================================================================

alter table public.notifications add column if not exists channel      text default 'in_app';
alter table public.notifications add column if not exists delivery     text default 'pending';
alter table public.notifications add column if not exists delivered_at timestamptz;

create index if not exists notifications_outbox_idx
  on public.notifications (delivery, created_at)
  where delivery = 'pending';

-- ============================================================================
-- 3. Fan out a new request to every compatible, eligible, available donor
-- ============================================================================

create or replace function public.notify_matching_donors()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  inserted_count integer;
begin
  insert into public.notifications (
    donor_id, title, message, type, related_blood_group, related_request_id, channel, delivery
  )
  select
    d.id,
    case new.urgency
      when 'Critical' then '🚨 CRITICAL: ' || new.blood_group || ' needed now'
      else '🩸 ' || new.blood_group || ' needed — ' || new.urgency
    end,
    new.patient_name || ' needs ' || new.required_bags || ' bag(s) of '
      || new.blood_group || ' at ' || new.hospital_name
      || coalesce(', ' || nullif(new.area, ''), '')
      || '. Contact: ' || new.contact_phone,
    'emergency',
    new.blood_group,
    new.id,
    'in_app',
    'pending'
  from public.donors d
  where d.role = 'donor'
    and d.id is distinct from new.requester_id            -- don't alert the requester
    and d.blood_group = any (public.compatible_donor_groups(new.blood_group))
    and d.available_now
    and (d.next_eligible_date is null or d.next_eligible_date <= current_date)
    and (
      new.district is null or new.district = '' or d.district = new.district
      or new.urgency = 'Critical'                          -- criticals go nationwide
    );

  get diagnostics inserted_count = row_count;
  raise notice 'LifelineBD: notified % donors for request %', inserted_count, new.id;

  return new;
end $$;

drop trigger if exists requests_notify_donors on public.requests;
create trigger requests_notify_donors after insert on public.requests
  for each row execute function public.notify_matching_donors();

-- ============================================================================
-- 4. Outbox view — what an SMS/WhatsApp sender should pick up
--    Joins in the phone number, which lives on donors (not exposed publicly).
-- ============================================================================

drop view if exists public.v_notification_outbox;
create view public.v_notification_outbox as
select
  n.id            as notification_id,
  n.donor_id,
  d.name          as donor_name,
  d.phone,
  d.whatsapp,
  n.title,
  n.message,
  n.type,
  n.related_request_id,
  n.created_at
from public.notifications n
join public.donors d on d.id = n.donor_id
where n.delivery = 'pending'
  and n.type = 'emergency'
order by n.created_at;

-- Only the service role (server side) should ever read this — it contains
-- phone numbers in bulk. No grant to anon or authenticated on purpose.
revoke all on public.v_notification_outbox from anon, authenticated;

-- ============================================================================
-- Test it:
--   1. Insert a request from the app.
--   2. select count(*) from notifications where type = 'emergency';
--   3. select * from v_notification_outbox;   -- run as service role / SQL editor
-- ============================================================================
