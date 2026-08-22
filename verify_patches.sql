-- LifelineBD: patch verification report
-- ----------------------------------------------------------------------------
-- Read-only. Run this in the Supabase SQL Editor to see which patch_NN_*.sql
-- files have actually been applied to THIS database. There's no migration
-- tracking table in this repo, so this checks for each patch's key objects
-- directly (tables, columns, functions, triggers, policies, indexes).
--
-- Also checks the functions every patch assumes already exist
-- (current_donor_id, is_admin, touch_updated_at) — none of the patch_NN
-- files in this repo create them, so if they're missing, every RLS policy
-- and SECURITY DEFINER function above will fail even if its own patch ran.
-- ============================================================================

with checks(patch, kind, name, present) as (
  values
  -- prerequisites (pre-existing, not created by any patch_NN file here)
  ('prereq',   'function', 'public.current_donor_id',              to_regproc('public.current_donor_id') is not null),
  ('prereq',   'function', 'public.is_admin',                      to_regproc('public.is_admin') is not null),
  ('prereq',   'function', 'public.touch_updated_at',               to_regproc('public.touch_updated_at') is not null),
  ('prereq',   'function', 'public.link_or_get_my_donor',           to_regproc('public.link_or_get_my_donor') is not null),
  ('prereq',   'function', 'public.offer_to_donate',                to_regproc('public.offer_to_donate') is not null),
  ('prereq',   'function', 'public.verify_donation',                to_regproc('public.verify_donation') is not null),

  -- patch_03_health_privacy
  ('patch_03', 'table',    'public.donor_health',                  to_regclass('public.donor_health') is not null),
  ('patch_03', 'function', 'public.create_donor_health_row',       to_regproc('public.create_donor_health_row') is not null),
  ('patch_03', 'trigger',  'donors_create_health',                 exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'donors' and t.tgname = 'donors_create_health' and not t.tgisinternal)),
  ('patch_03', 'trigger',  'donor_health_touch',                   exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'donor_health' and t.tgname = 'donor_health_touch' and not t.tgisinternal)),
  ('patch_03', 'policy',   'donor_health_own',                     exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'donor_health' and policyname = 'donor_health_own')),
  ('patch_03', 'policy',   'donor_health_admin',                   exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'donor_health' and policyname = 'donor_health_admin')),
  ('patch_03', 'view',     'public.v_donors_directory',            to_regclass('public.v_donors_directory') is not null),
  ('patch_03', 'policy',   'donors_select_own',                    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'donors' and policyname = 'donors_select_own')),

  -- patch_04_auto_notify
  ('patch_04', 'function', 'public.compatible_donor_groups',       to_regproc('public.compatible_donor_groups') is not null),
  ('patch_04', 'column',   'notifications.channel',                exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'channel')),
  ('patch_04', 'column',   'notifications.delivery',               exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'delivery')),
  ('patch_04', 'column',   'notifications.delivered_at',           exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'notifications' and column_name = 'delivered_at')),
  ('patch_04', 'index',    'notifications_outbox_idx',             to_regclass('public.notifications_outbox_idx') is not null),
  ('patch_04', 'function', 'public.notify_matching_donors',        to_regproc('public.notify_matching_donors') is not null),
  ('patch_04', 'trigger',  'requests_notify_donors',                exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'requests' and t.tgname = 'requests_notify_donors' and not t.tgisinternal)),
  ('patch_04', 'view',     'public.v_notification_outbox',         to_regclass('public.v_notification_outbox') is not null),

  -- patch_05_rls_hardening
  ('patch_05', 'policy',   'requests_insert_authenticated',        exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'requests' and policyname = 'requests_insert_authenticated')),
  ('patch_05', 'policy',   'requests_update_owner_or_admin',       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'requests' and policyname = 'requests_update_owner_or_admin')),
  ('patch_05', 'policy',   'requests_delete_owner_or_admin',       exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'requests' and policyname = 'requests_delete_owner_or_admin')),
  ('patch_05', 'policy',   'donors_update_own_or_admin',           exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'donors' and policyname = 'donors_update_own_or_admin')),
  ('patch_05', 'policy',   'notifications_select_own_or_admin',    exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_own_or_admin')),
  ('patch_05', 'policy',   'notifications_update_own',             exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update_own')),

  -- patch_06_fix_donation_status
  ('patch_06', 'function', 'public.record_donation',               to_regproc('public.record_donation') is not null),

  -- patch_07_fix_confirmation_status
  ('patch_07', 'function', 'public.confirm_my_donation',           to_regproc('public.confirm_my_donation') is not null),

  -- patch_08_prevent_duplicate_donors
  ('patch_08', 'index',    'donors_auth_user_id_key',              to_regclass('public.donors_auth_user_id_key') is not null),
  ('patch_08', 'index',    'donors_email_unique_idx',              to_regclass('public.donors_email_unique_idx') is not null),

  -- patch_09_donor_privilege_lockdown
  ('patch_09', 'function', 'public.guard_donor_privileged_fields', to_regproc('public.guard_donor_privileged_fields') is not null),
  ('patch_09', 'trigger',  'donors_guard_privileged_fields',       exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid where c.relname = 'donors' and t.tgname = 'donors_guard_privileged_fields' and not t.tgisinternal))
)
select
  patch,
  kind,
  name,
  case when present then '✅ present' else '❌ MISSING' end as status
from checks
order by
  case patch
    when 'prereq' then 0
    else 1
  end,
  patch, kind, name;

-- Quick summary: which patches are fully applied vs. need attention.
-- (Run this as a second query, or comment out the SELECT above.)
--
-- with checks(patch, present) as (
--   select patch, present from ( ... same VALUES list as above ... ) x
-- )
-- select patch,
--        count(*) filter (where not present) as missing_objects,
--        count(*) as total_objects
-- from checks
-- group by patch
-- order by patch;
