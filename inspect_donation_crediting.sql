-- Read-only. Run in the Supabase SQL Editor and paste back the results.
-- Answers: (1) does apply_donation()/a donation_records trigger exist, and if
-- so what does it do; (2) what does verify_donation() actually do — neither
-- object is defined in any patch_NN_*.sql file in the repo, so this is the
-- only way to see their real bodies.

-- 1. Any triggers currently defined on donation_records
select
  t.tgname as trigger_name,
  p.proname as function_name,
  pg_get_triggerdef(t.oid) as trigger_definition
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc p on p.oid = t.tgfoid
where c.relname = 'donation_records'
  and not t.tgisinternal;

-- 2. Full source of apply_donation(), if it exists
select pg_get_functiondef(p.oid) as apply_donation_source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'apply_donation';

-- 3. Full source of verify_donation() — the hospital-side crediting path,
--    not present in any tracked patch file
select pg_get_functiondef(p.oid) as verify_donation_source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'verify_donation';

-- 4. Sanity check: any donation_records rows credited more than once, or
--    donors whose impact_score doesn't match 150 * (number of credited rows)
select donor_id, count(*) as credited_rows, sum(150) as expected_points_from_these
from donation_records
where credited = true
group by donor_id
having count(*) > 1
order by credited_rows desc;
