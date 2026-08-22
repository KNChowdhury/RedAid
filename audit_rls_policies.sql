-- Read-only. Lists every policy per command on the tables that matter most,
-- so duplicate/overlapping PERMISSIVE policies (which OR together, not AND)
-- are visible at a glance before adding anything new.
select tablename, policyname, cmd, permissive, roles, qual, with_check
from pg_policies
where tablename in ('donors', 'donation_records', 'request_responses', 'requests', 'notifications')
order by tablename, cmd, policyname;
