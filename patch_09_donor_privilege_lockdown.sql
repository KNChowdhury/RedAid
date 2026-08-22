-- LifelineBD PATCH 09: Stop donors from self-escalating privileged fields.
-- ----------------------------------------------------------------------------
-- PROBLEM: donors_update_own_or_admin (patch_05) lets a signed-in donor update
-- every column of their own row, not just the profile fields the UI exposes.
-- Since the anon/authenticated key is public by design, anyone can bypass the
-- app entirely and call the REST API directly, e.g.:
--
--   supabase.from('donors').update({ role: 'admin', is_verified: true,
--     impact_score: 999999, lives_saved: 999 }).eq('id', myOwnDonorId)
--
-- RLS's row-level USING/WITH CHECK can't restrict individual columns, so this
-- silently succeeds today and grants the caller admin access, verified-donor
-- status, and fabricated reward points on their own account.
--
-- FIX: a trigger that resets privileged columns to their prior/default value
-- whenever the write comes directly from a PostgREST client request (role
-- 'authenticated' or 'anon') and the caller isn't an admin. Writes made by our
-- SECURITY DEFINER functions (confirm_my_donation crediting impact_score,
-- record_donation, etc.) run as the function owner, not as 'authenticated', so
-- they pass through untouched — only unmediated client writes are guarded.
-- ============================================================================

create or replace function public.guard_donor_privileged_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Only PostgREST's client-facing roles are subject to the guard. Calls made
  -- from inside our own SECURITY DEFINER functions run as the function owner
  -- (e.g. postgres), not as 'authenticated'/'anon', and are already
  -- authorization-checked in their own function body.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'donor';
    new.is_verified := false;
    new.impact_score := 0;
    new.lives_saved := 0;
    return new;
  end if;

  -- UPDATE: identity, role and reward/verification fields are immutable for
  -- the row owner; they only ever change via admin action or our own
  -- SECURITY DEFINER functions, both of which already returned above.
  new.auth_user_id := old.auth_user_id;
  new.role := old.role;
  new.is_verified := old.is_verified;
  new.impact_score := old.impact_score;
  new.lives_saved := old.lives_saved;
  return new;
end $$;

drop trigger if exists donors_guard_privileged_fields on public.donors;
create trigger donors_guard_privileged_fields before insert or update on public.donors
  for each row execute function public.guard_donor_privileged_fields();
