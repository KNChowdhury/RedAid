-- LifelineBD PATCH 13: Close another donors-table full-read hole.
-- ----------------------------------------------------------------------------
-- PROBLEM: donors_select_authenticated (SELECT, role authenticated, qual =
-- true) was found in a fresh RLS audit that did not exist in the prior audit
-- pass (same untracked-external-change pattern as "Public read donors",
-- which applied to anon/public and was already dropped). Since Postgres ORs
-- multiple permissive policies together, this one alone makes
-- donors_select_own's ownership check meaningless: ANY signed-in donor
-- (trivially obtained via free signup) can read every other donor's raw row
-- directly via the REST API, including email, phone, and whatsapp.
--
-- FIX: drop it. donors_select_own (own row or admin) is the correct policy
-- and remains in place; the app's own directory browsing already goes
-- through v_donors_directory / v_public_donors, which never expose email or
-- phone, so nothing in the app depends on this policy.
-- ============================================================================

drop policy if exists "donors_select_authenticated" on public.donors;
