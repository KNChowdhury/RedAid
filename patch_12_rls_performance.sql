-- LifelineBD PATCH 12: Fix "Auth RLS Initialization Plan" performance warnings.
-- ----------------------------------------------------------------------------
-- PROBLEM: RLS policies calling auth.uid() / public.is_admin() /
-- public.current_donor_id() directly force Postgres to re-evaluate that call
-- for every row scanned. Wrapping the call in a `(select ...)` subquery lets
-- the planner evaluate it once per statement (as an InitPlan) and reuse the
-- cached result across all rows — same logic, no behavior change, just less
-- per-row work. This is Supabase's documented fix for that advisor warning.
--
-- SCOPE: every currently-live policy from the audit
-- (select policyname, cmd, qual, with_check from pg_policies ...) that calls
-- one of those three functions unwrapped. Each policy below is reproduced
-- with its EXACT existing name, role list, command, and boolean logic —
-- only the function calls are wrapped. Nothing is consolidated or removed
-- here, even where multiple policies visibly overlap (e.g. donors has two
-- near-identical INSERT policies, notifications has two near-identical
-- SELECT/UPDATE policies, request_responses has four overlapping policies).
-- That's a separate "Multiple Permissive Policies" cleanup decision — same
-- category of thing you already found and fixed on requests' INSERT
-- policies — and is intentionally left for you to decide table-by-table
-- rather than being silently folded into a performance-only patch.
--
-- Policies already handled elsewhere are excluded from this file:
--   - donation_records_insert_own -> dropped in patch_11 (security hole)
--   - "Public read donors" -> already dropped live (security hole)
--   - any policy whose qual/with_check is just `true` -> nothing to wrap
-- ============================================================================

-- ---------- badges ----------
drop policy if exists "badges_admin" on public.badges;
create policy "badges_admin" on public.badges
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- donation_records ----------
drop policy if exists "donation_records_admin" on public.donation_records;
create policy "donation_records_admin" on public.donation_records
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Users see own donation history" on public.donation_records;
create policy "Users see own donation history" on public.donation_records
  for select to public
  using (donor_id in (select donors.id from public.donors where donors.auth_user_id = (select auth.uid())));

drop policy if exists "donation_records_select" on public.donation_records;
create policy "donation_records_select" on public.donation_records
  for select to authenticated
  using (
    (donor_id = (select public.current_donor_id()))
    or (recorded_by = (select public.current_donor_id()))
    or (exists (select 1 from public.requests r where r.id = donation_records.request_id and r.requester_id = (select public.current_donor_id())))
    or (select public.is_admin())
    or (exists (select 1 from public.donors d where d.id = (select public.current_donor_id()) and d.role = 'hospital'))
  );

drop policy if exists "donation_records_select_own" on public.donation_records;
create policy "donation_records_select_own" on public.donation_records
  for select to authenticated
  using (
    (donor_id = (select public.current_donor_id()))
    or (select public.is_admin())
  );

-- ---------- donor_badges ----------
drop policy if exists "donor_badges_admin" on public.donor_badges;
create policy "donor_badges_admin" on public.donor_badges
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- donor_health ----------
drop policy if exists "donor_health_admin" on public.donor_health;
create policy "donor_health_admin" on public.donor_health
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "donor_health_own" on public.donor_health;
create policy "donor_health_own" on public.donor_health
  for all to authenticated
  using (donor_id = (select public.current_donor_id()))
  with check (donor_id = (select public.current_donor_id()));

-- ---------- donors ----------
drop policy if exists "donors_admin_all" on public.donors;
create policy "donors_admin_all" on public.donors
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists "Users insert own profile" on public.donors;
create policy "Users insert own profile" on public.donors
  for insert to public
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "donors_insert_self" on public.donors;
create policy "donors_insert_self" on public.donors
  for insert to authenticated
  with check (auth_user_id = (select auth.uid()));

drop policy if exists "donors_select_own" on public.donors;
create policy "donors_select_own" on public.donors
  for select to authenticated
  using ((auth_user_id = (select auth.uid())) or (select public.is_admin()));

drop policy if exists "Users update own profile" on public.donors;
create policy "Users update own profile" on public.donors
  for update to public
  using ((select auth.uid()) = auth_user_id)
  with check ((select auth.uid()) = auth_user_id);

drop policy if exists "donors_update_own_or_admin" on public.donors;
create policy "donors_update_own_or_admin" on public.donors
  for update to authenticated
  using ((auth_user_id = (select auth.uid())) or (select public.is_admin()))
  with check ((auth_user_id = (select auth.uid())) or (select public.is_admin()));

drop policy if exists "donors_update_self" on public.donors;
create policy "donors_update_self" on public.donors
  for update to authenticated
  using (auth_user_id = (select auth.uid()))
  with check (auth_user_id = (select auth.uid()));

-- ---------- hospitals ----------
drop policy if exists "hospitals_own" on public.hospitals;
create policy "hospitals_own" on public.hospitals
  for all to authenticated
  using ((donor_id = (select public.current_donor_id())) or (select public.is_admin()))
  with check ((donor_id = (select public.current_donor_id())) or (select public.is_admin()));

drop policy if exists "hospitals_write_admin" on public.hospitals;
create policy "hospitals_write_admin" on public.hospitals
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- locations ----------
drop policy if exists "locations_write_admin" on public.locations;
create policy "locations_write_admin" on public.locations
  for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- notifications ----------
drop policy if exists "notifications_own" on public.notifications;
create policy "notifications_own" on public.notifications
  for all to authenticated
  using (donor_id = (select public.current_donor_id()))
  with check (donor_id = (select public.current_donor_id()));

drop policy if exists "Users see own notifications" on public.notifications;
create policy "Users see own notifications" on public.notifications
  for select to public
  using (donor_id in (select donors.id from public.donors where donors.auth_user_id = (select auth.uid())));

drop policy if exists "notifications_select_own_or_admin" on public.notifications;
create policy "notifications_select_own_or_admin" on public.notifications
  for select to authenticated
  using ((donor_id = (select public.current_donor_id())) or (select public.is_admin()));

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications" on public.notifications
  for update to public
  using (donor_id in (select donors.id from public.donors where donors.auth_user_id = (select auth.uid())))
  with check (donor_id in (select donors.id from public.donors where donors.auth_user_id = (select auth.uid())));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (donor_id = (select public.current_donor_id()))
  with check (donor_id = (select public.current_donor_id()));

-- ---------- request_responses ----------
drop policy if exists "responses_own" on public.request_responses;
create policy "responses_own" on public.request_responses
  for all to authenticated
  using (donor_id = (select public.current_donor_id()))
  with check (donor_id = (select public.current_donor_id()));

drop policy if exists "rr_delete_own" on public.request_responses;
create policy "rr_delete_own" on public.request_responses
  for delete to authenticated
  using (donor_id = (select public.current_donor_id()));

drop policy if exists "rr_insert_own" on public.request_responses;
create policy "rr_insert_own" on public.request_responses
  for insert to authenticated
  with check (donor_id = (select public.current_donor_id()));

drop policy if exists "responses_select" on public.request_responses;
create policy "responses_select" on public.request_responses
  for select to authenticated
  using (
    (donor_id = (select public.current_donor_id()))
    or (select public.is_admin())
    or (exists (select 1 from public.requests r where r.id = request_responses.request_id and r.requester_id = (select public.current_donor_id())))
  );

drop policy if exists "rr_select" on public.request_responses;
create policy "rr_select" on public.request_responses
  for select to authenticated
  using (
    (donor_id = (select public.current_donor_id()))
    or (exists (select 1 from public.requests r where r.id = request_responses.request_id and r.requester_id = (select public.current_donor_id())))
    or (select public.is_admin())
    or (exists (select 1 from public.donors d where d.id = (select public.current_donor_id()) and d.role = 'hospital'))
  );

-- ---------- requests ----------
drop policy if exists "requests_delete_owner_or_admin" on public.requests;
create policy "requests_delete_owner_or_admin" on public.requests
  for delete to authenticated
  using ((requester_id = (select public.current_donor_id())) or (select public.is_admin()));

drop policy if exists "requests_insert_valid_owner" on public.requests;
create policy "requests_insert_valid_owner" on public.requests
  for insert to authenticated
  with check (
    (requester_id = (select public.current_donor_id()))
    and (blood_group = any (array['A+','A-','B+','B-','AB+','AB-','O+','O-']))
    and (patient_name is not null)
    and (btrim(patient_name) <> '')
    and (hospital_name is not null)
    and (btrim(hospital_name) <> '')
    and (required_bags > 0)
  );

drop policy if exists "requests_update_owner_or_admin" on public.requests;
create policy "requests_update_owner_or_admin" on public.requests
  for update to authenticated
  using ((requester_id = (select public.current_donor_id())) or (select public.is_admin()))
  with check ((requester_id = (select public.current_donor_id())) or (select public.is_admin()));
