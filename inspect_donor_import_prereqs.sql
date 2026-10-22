-- Read-only. Run in the Supabase SQL editor before the O+ bulk donor import
-- (patch_30). Answers: can a donor row exist without an auth account, how does
-- link_or_get_my_donor pair accounts to rows, and which policies/triggers fire
-- on insert. No personal data is selected.

-- 1. donors columns: nullability and defaults
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'donors'
order by ordinal_position;

-- 2. constraints and unique indexes (auth_user_id, phone, email)
select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.donors'::regclass;
select indexname, indexdef from pg_indexes
where schemaname = 'public' and tablename = 'donors';

-- 3. RLS policies on donors
select policyname, cmd, roles, qual, with_check
from pg_policies where schemaname = 'public' and tablename = 'donors';

-- 4. triggers on donors and on auth.users (a signup trigger may auto-create rows)
select event_object_schema, event_object_table, trigger_name, action_timing,
       event_manipulation, action_statement
from information_schema.triggers
where (event_object_schema, event_object_table) in (('public','donors'), ('auth','users'));

-- 5. how accounts are linked to donor rows
select pg_get_functiondef('public.link_or_get_my_donor'::regproc);

-- 6. counts only: does the phone format already collide with existing donors?
select count(*) as donors_total,
       count(*) filter (where phone ~ '^01[3-9][0-9]{8}$') as phone_local_format,
       count(*) filter (where phone ~ '^\+?880') as phone_880_format
from public.donors;
