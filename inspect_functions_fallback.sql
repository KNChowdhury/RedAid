-- Run these ONE AT A TIME, not batched together.

-- A) Locate apply_donation regardless of schema
select n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'apply_donation';

-- B) Locate verify_donation regardless of schema
select n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where p.proname = 'verify_donation';
