-- LifelineBD: RLS hardening for request ownership, donor updates, and notifications.
-- Run in Supabase SQL Editor after patch_03_health_privacy.sql.

alter table public.requests enable row level security;
alter table public.notifications enable row level security;

-- A signed-in donor may create only a request owned by their donor row.
drop policy if exists requests_insert_authenticated on public.requests;
create policy requests_insert_authenticated on public.requests
  for insert to authenticated
  with check (requester_id = public.current_donor_id());

-- Requesters and admins may manage requests; everyone authenticated may read
-- the public emergency feed if the existing product policy allows it.
drop policy if exists requests_update_owner_or_admin on public.requests;
create policy requests_update_owner_or_admin on public.requests
  for update to authenticated
  using (requester_id = public.current_donor_id() or public.is_admin())
  with check (requester_id = public.current_donor_id() or public.is_admin());

drop policy if exists requests_delete_owner_or_admin on public.requests;
create policy requests_delete_owner_or_admin on public.requests
  for delete to authenticated
  using (requester_id = public.current_donor_id() or public.is_admin());

-- Donors may update their own non-role fields; admins may update verification.
drop policy if exists donors_update_own_or_admin on public.donors;
create policy donors_update_own_or_admin on public.donors
  for update to authenticated
  using (auth_user_id = auth.uid() or public.is_admin())
  with check (auth_user_id = auth.uid() or public.is_admin());

-- Notifications are private to their recipient, with admin access for support.
drop policy if exists notifications_select_own_or_admin on public.notifications;
create policy notifications_select_own_or_admin on public.notifications
  for select to authenticated
  using (donor_id = public.current_donor_id() or public.is_admin());

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (donor_id = public.current_donor_id())
  with check (donor_id = public.current_donor_id());

-- The client must never read the bulk notification outbox containing phone data.
revoke all on public.v_notification_outbox from anon, authenticated;
