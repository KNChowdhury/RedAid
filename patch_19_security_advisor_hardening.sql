-- LifelineBD PATCH 19: Security Advisor hardening for exposed functions.
-- ----------------------------------------------------------------------------
-- The client intentionally calls the donation workflow RPCs as authenticated.
-- Do not revoke authenticated EXECUTE here: that would break the app. These
-- functions must enforce authorization internally, as their definitions do.
-- Anonymous and PUBLIC execution is never needed and is revoked explicitly.
--
-- The SECURITY DEFINER view findings are documented in CODEBASE_REVIEW.md.
-- Do not set security_invoker on the directory/feed views until their safe
-- projection tables or reviewed RPC replacements exist; doing so immediately
-- would make the public directory and success feed obey private base-table RLS.
-- ============================================================================

-- RLS helper functions are used by policies, not by the browser directly.
revoke execute on function public.current_donor_id() from public, anon;
revoke execute on function public.is_admin() from public, anon;

-- These RPCs are called by the authenticated application workflow.
revoke execute on function public.link_or_get_my_donor() from public, anon;
revoke execute on function public.offer_to_donate(uuid, text) from public, anon;
revoke execute on function public.record_donation(uuid, uuid, integer) from public, anon;
revoke execute on function public.confirm_my_donation(uuid) from public, anon;
revoke execute on function public.verify_donation(uuid, uuid, integer) from public, anon;

-- Trigger-only SECURITY DEFINER functions must not be callable through REST.
revoke execute on function public.create_donor_health_row() from public, anon, authenticated;
revoke execute on function public.notify_matching_donors() from public, anon, authenticated;
revoke execute on function public.guard_donor_privileged_fields() from public, anon, authenticated;

-- Verify the resulting exposed execute privileges after this patch.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_can_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'current_donor_id', 'is_admin', 'link_or_get_my_donor',
    'offer_to_donate', 'record_donation', 'confirm_my_donation',
    'verify_donation', 'create_donor_health_row',
    'notify_matching_donors', 'guard_donor_privileged_fields'
  )
order by p.proname, arguments;
