-- LifelineBD PATCH 29: make the donor privilege guard actually run.
-- ============================================================================
-- INCIDENT NOTE (found 2026-10-11 in a full-codebase security review)
--
-- WHAT BROKE: patch_09's guard_donor_privileged_fields() was declared
-- SECURITY DEFINER. Inside a SECURITY DEFINER function, current_user is the
-- function OWNER (postgres), never 'authenticated' or 'anon'. So its first
-- check
--     if current_user not in ('authenticated', 'anon') then return new;
-- was always true, and the function returned before any reset ran. The guard
-- has been a no-op since patch_09 was applied.
--
-- IMPACT: any signed-in user could call the REST API directly, e.g.
--     supabase.from('donors').update({ role: 'admin', is_verified: true,
--       impact_score: 99999 }).eq('id', myOwnDonorId)
-- and it would succeed (donors_update_own_or_admin only checks row
-- ownership). role='admin' makes is_admin() true, which opens every donor's
-- phone/WhatsApp and donor_health (HIV/HBsAg) rows, all requests and all
-- notifications. role='hospital' opens hospital-only paths. Fabricated
-- impact_score / is_verified are published to the public directory.
--
-- HOW IT WAS CAUGHT: code review, reasoning about SECURITY DEFINER semantics.
-- Run section 0 BEFORE applying to see whether anyone already exploited it.
--
-- FIX: SECURITY INVOKER. Then current_user is the role executing the
-- statement: 'authenticated'/'anon' for a direct client write (guard applies),
-- the function owner for writes made from inside our own SECURITY DEFINER
-- RPCs such as confirm_my_donation (guard skipped, as patch_09 intended).
-- is_admin() is itself SECURITY DEFINER and executable by authenticated
-- (patch_19 only revoked it from public/anon), so calling it here still works.
--
-- PREVENTION: section 2 is a behavioural test, run as the real
-- 'authenticated' role. Checking the function text alone is how this slipped
-- through the first time.
--
-- Idempotent: safe to re-run.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 0. BEFORE applying: who already has a privileged role / fabricated stats?
--    Every row here should be someone you recognise. Anything else = treat as
--    an incident (reset the row, rotate anything that admin could have read).
-- ---------------------------------------------------------------------------
select id, name, role, is_verified, impact_score, lives_saved, created_at
from public.donors
where role <> 'donor'
   or is_verified
   or impact_score > 0
   or lives_saved > 0
order by role, impact_score desc;


-- ---------------------------------------------------------------------------
-- 1. The fix.
-- ---------------------------------------------------------------------------
create or replace function public.guard_donor_privileged_fields()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  -- Direct client writes run as 'authenticated'/'anon' and are guarded.
  -- Writes from inside our SECURITY DEFINER RPCs run as the function owner
  -- and were already authorization-checked in their own bodies.
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
  -- the row owner.
  new.auth_user_id := old.auth_user_id;
  new.role := old.role;
  new.is_verified := old.is_verified;
  new.impact_score := old.impact_score;
  new.lives_saved := old.lives_saved;
  return new;
end $$;

-- Trigger functions are never called directly (patch_19 pattern).
revoke execute on function public.guard_donor_privileged_fields() from public, anon, authenticated;

drop trigger if exists donors_guard_privileged_fields on public.donors;
create trigger donors_guard_privileged_fields
  before insert or update on public.donors
  for each row execute function public.guard_donor_privileged_fields();


-- ---------------------------------------------------------------------------
-- 2. AFTER applying: behavioural test as the real 'authenticated' role.
--    Replace <TEST_AUTH_UID> with the auth user id of a NON-admin test donor.
--    Runs inside a transaction that is rolled back, so nothing is changed.
--    Expected result: role = 'donor', is_verified = false, impact_score
--    unchanged. If you see 'admin', the guard is still not working.
-- ---------------------------------------------------------------------------
-- begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<TEST_AUTH_UID>","role":"authenticated"}';
--   update public.donors
--      set role = 'admin', is_verified = true, impact_score = 99999
--    where auth_user_id = '<TEST_AUTH_UID>'
--   returning role, is_verified, impact_score;
-- rollback;

-- Function should now report prosecdef = false.
select proname, prosecdef as is_security_definer, proconfig
from pg_proc
where proname = 'guard_donor_privileged_fields';
