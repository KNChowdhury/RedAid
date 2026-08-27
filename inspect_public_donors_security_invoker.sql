-- Read-only. Checks WHY v_public_donors might show 0 donors to guests, given
-- that anon already has SELECT granted on it (confirmed via
-- inspect_public_donors_grants.sql). A missing GRANT isn't the only way this
-- can fail: if the view respects RLS (security_invoker = true) instead of
-- bypassing it, an anon caller with no matching RLS-visible rows sees nothing
-- even though the GRANT is fine.
--
-- Expected: security_invoker unset/false, same as v_donors_directory and
-- v_completed_donations (see patch_18's comment on why that's intentional
-- for these public feeds) -- UNLESS patch_20_security_invoker_public_feeds.sql
-- has actually been run, in which case v_public_donors legitimately reads
-- `security_invoker = true` because it was repointed at the
-- donor_directory_public projection table, which carries its own permissive
-- "select to anon, authenticated using (true)" policy. Distinguish these two
-- cases with the view definition below before concluding anything is broken.
-- ============================================================================

select pg_get_viewdef('public.v_public_donors', true) as v_public_donors_def;

select
  'security_invoker=true' = any(reloptions) as is_security_invoker,
  reloptions
from pg_class
where relname = 'v_public_donors';
