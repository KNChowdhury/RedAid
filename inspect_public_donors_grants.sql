-- Read-only. Checks whether the anon (guest/logged-out) role actually has
-- SELECT permission on v_public_donors — if not, that's why incognito shows
-- 0 donors: the query is silently failing with a permission error and the
-- app just falls back to an empty list.
select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'v_public_donors';
