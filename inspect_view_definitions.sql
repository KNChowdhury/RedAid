-- Read-only. Confirms whether v_donors_directory / v_public_donors have
-- security_invoker set, and shows their exact column lists and definitions.

-- 1. Full view definitions (which columns each selects, and from where)
select pg_get_viewdef('public.v_donors_directory', true) as v_donors_directory_def;
select pg_get_viewdef('public.v_public_donors', true) as v_public_donors_def;

-- 2. security_invoker setting (shows in reloptions if explicitly set;
--    absent/null means the default, security_invoker = false)
select relname, reloptions
from pg_class
where relname in ('v_donors_directory', 'v_public_donors');

-- 3. Who owns these views (matters for the "bypasses RLS as owner" behavior
--    when security_invoker is off)
select c.relname, pg_get_userbyid(c.relowner) as owner
from pg_class c
where c.relname in ('v_donors_directory', 'v_public_donors');
