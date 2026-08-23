-- LifelineBD PATCH 15: Consolidate duplicate permissive RLS policies.
-- ----------------------------------------------------------------------------
-- Source: today's Supabase Advisor "Multiple Permissive Policies" report
-- (13 warnings across badges, donation_records, donor_health, donors,
-- hospitals, notifications, request_responses). Unlike patch_11/patch_13,
-- none of these are security holes — in every case, one of the overlapping
-- policies' conditions is already an OR-superset of the other(s), so merging
-- changes ZERO actual access, only reduces how many policies Postgres must
-- evaluate per row. (donor_badges and locations were also flagged but are
-- deliberately left alone below — see notes.)
--
-- (`patch_14` was already used in a parallel session for the duplicate-donor
-- fix, so this is numbered patch_15 to avoid colliding with that history.)
-- ============================================================================

-- ---------- badges ----------
-- "Public read badges" (role public, true) is a strict duplicate of
-- badges_select (role anon,authenticated — already a superset of public
-- for this purpose — true). Drop the redundant one.
drop policy if exists "Public read badges" on public.badges;
-- badges_admin (ALL, is_admin) stays: still the only INSERT/UPDATE/DELETE path.

-- ---------- donation_records ----------
-- donation_records_select's condition (own OR recorded_by OR requester-of-
-- request OR admin OR hospital-role) is already a superset of both
-- "Users see own donation history" (own, via a donors-table subquery on
-- auth.uid() — for anon this is always false anyway since auth.uid() is
-- null there) and donation_records_select_own (own OR admin). Drop both.
drop policy if exists "Users see own donation history" on public.donation_records;
drop policy if exists "donation_records_select_own" on public.donation_records;
-- donation_records_select remains as the sole (broadest) SELECT policy.
-- donation_records_admin (ALL, is_admin) stays for INSERT/UPDATE/DELETE.

-- ---------- donor_health ----------
-- donor_health_admin (ALL, is_admin) and donor_health_own (ALL, own) both
-- cover every command for their respective actor — a true 1:1 merge.
drop policy if exists "donor_health_admin" on public.donor_health;
drop policy if exists "donor_health_own" on public.donor_health;
drop policy if exists "donor_health_own_or_admin" on public.donor_health;
create policy "donor_health_own_or_admin" on public.donor_health
  for all to authenticated
  using ((donor_id = (select public.current_donor_id())) or (select public.is_admin()))
  with check ((donor_id = (select public.current_donor_id())) or (select public.is_admin()));

-- ---------- donors ----------
-- INSERT: "Users insert own profile" (role public) and donors_insert_self
-- (role authenticated) are the identical condition on overlapping role
-- scopes. Merge into one, keeping the broader (public) role scope — an
-- anon insert attempt still fails since auth.uid() is null there.
drop policy if exists "Users insert own profile" on public.donors;
drop policy if exists "donors_insert_self" on public.donors;
create policy "donors_insert_self" on public.donors
  for insert to public
  with check (auth_user_id = (select auth.uid()));

-- UPDATE: donors_update_own_or_admin (own OR admin) is already a superset
-- of "Users update own profile" (own only, role public) and
-- donors_update_self (own only, role authenticated). Drop both narrower ones.
drop policy if exists "Users update own profile" on public.donors;
drop policy if exists "donors_update_self" on public.donors;
-- donors_update_own_or_admin remains as the sole UPDATE policy.
-- donors_admin_all (ALL, is_admin) stays: still the only DELETE path, and
-- SELECT is already handled by donors_select_own (patch_13 closed the
-- separate donors_select_authenticated hole).

-- ---------- hospitals ----------
-- hospitals_own's condition (own OR admin) is already a strict superset of
-- hospitals_write_admin (admin only) across every command. Drop the latter.
drop policy if exists "hospitals_write_admin" on public.hospitals;
-- hospitals_own (ALL) and hospitals_select (public read, true) remain.

-- ---------- notifications ----------
-- SELECT: notifications_select_own_or_admin (own OR admin) is a superset of
-- "Users see own notifications" (own only, via subquery). Drop the latter.
drop policy if exists "Users see own notifications" on public.notifications;

-- UPDATE: notifications_own (ALL, own) already covers UPDATE with the exact
-- same condition as notifications_update_own and (for authenticated actors)
-- "Users update own notifications" — both fully redundant given notifications_own.
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
-- notifications_own (ALL) covers INSERT/UPDATE/DELETE by the owner;
-- notifications_select_own_or_admin remains the sole SELECT policy (it adds
-- admin access that notifications_own's plain "own" condition does not).

-- ---------- request_responses ----------
-- responses_own (ALL, own) already covers INSERT/DELETE with the same
-- condition as rr_insert_own/rr_delete_own. rr_select's condition (own OR
-- requester-of-request OR admin OR hospital-role) is a strict superset of
-- responses_select (own OR requester-of-request OR admin, no hospital-role
-- clause). Drop all three redundant ones.
drop policy if exists "rr_delete_own" on public.request_responses;
drop policy if exists "rr_insert_own" on public.request_responses;
drop policy if exists "responses_select" on public.request_responses;
-- responses_own (ALL) remains for INSERT/UPDATE/DELETE by the owner;
-- rr_select remains as the sole (broadest) SELECT policy.

-- ---------- deliberately left alone ----------
-- donor_badges: donor_badges_select (true) already grants everyone read
-- access, making donor_badges_admin's SELECT redundant — but donor_badges_admin
-- (ALL, is_admin) is still the only INSERT/UPDATE/DELETE path, and splitting
-- it into per-command policies just to shave one redundant SELECT check on a
-- small, non-sensitive table isn't worth the added complexity.
--
-- locations: same shape as donor_badges (locations_select true + admin ALL)
-- and the same reasoning applies — left as-is.
