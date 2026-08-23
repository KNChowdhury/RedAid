-- LifelineBD PATCH 22: Reveal a responder's contact info, safely.
-- ----------------------------------------------------------------------------
-- BACKGROUND: ProfileModal and the donor card have always gated a
-- "Call"/"WhatsApp" reveal on `donor.availableNow` (see Modals.tsx,
-- DonorsNetwork.tsx), but `v_donors_directory`/`v_public_donors` never
-- select phone or whatsapp (patch_03, patch_20) — those branches have been
-- dead code since the very first privacy-hardening pass. A prior attempt to
-- "fix" this by syncing phone/whatsapp into `donor_directory_public` was
-- reverted in patch_21: that table backs `v_public_donors` too, so it made
-- every available donor's number readable by anonymous guests, not just
-- signed-in users. See patch_21 for the full incident writeup.
--
-- DESIGN: contact info is revealed only through an existing, already-
-- consented relationship — a donor who has responded to a specific request
-- (public.request_responses) — never through open directory browsing.
-- Nothing here adds a column any guest-facing view reads from.
--
-- get_responder_contact(p_response_id):
--   - callable by `authenticated` only (revoked from public/anon below).
--   - returns phone/whatsapp ONLY if ALL of:
--       1. the caller is a donor (current_donor_id() is not null);
--       2. that response belongs to a request the caller themselves posted
--          (requests.requester_id = caller), checked fresh on every call —
--          not cached, not trusted from the client;
--       3. the responding donor's available_now is STILL true right now.
--   - otherwise returns zero rows. Every failure mode (not the requester,
--     donor went off-duty, rate-limited) looks identical from the outside:
--     no data, no distinguishing error, so nothing about *why* leaks either.
--   - light rate limit as defense-in-depth: no directory to scrape here
--     (a response_id only exists once someone has actually responded, and
--     RLS on request_responses already limits who can even see one — see
--     rr_select in patch_12/patch_15), but capping calls costs nothing and
--     guards against a future code path we haven't thought of yet calling
--     this more broadly than intended.
-- ============================================================================

-- ---------- Rate-limit log (defense-in-depth only) ----------
-- No policy is created on purpose: RLS is enabled with zero grants, so no
-- role can read/write this directly over PostgREST. Only the SECURITY
-- DEFINER function below (running as its owner, which owns this table) can
-- touch it. Same "no grant to anon or authenticated on purpose" pattern as
-- patch_04's notification outbox.
create table if not exists public.donor_contact_reveal_log (
  id bigint generated always as identity primary key,
  caller_donor_id uuid not null references public.donors(id) on delete cascade,
  response_id uuid not null,
  called_at timestamptz not null default now()
);

alter table public.donor_contact_reveal_log enable row level security;
revoke all on public.donor_contact_reveal_log from public, anon, authenticated;

create index if not exists donor_contact_reveal_log_caller_idx
  on public.donor_contact_reveal_log (caller_donor_id, called_at desc);

-- ---------- The RPC itself ----------
create or replace function public.get_responder_contact(p_response_id uuid)
returns table (phone text, whatsapp text)
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_caller_id uuid := public.current_donor_id();
  v_donor_id uuid;
  v_requester_id uuid;
  v_available boolean;
  v_recent_calls integer;
begin
  if v_caller_id is null then
    return; -- not signed in / no linked donor row
  end if;

  select rr.donor_id, r.requester_id
    into v_donor_id, v_requester_id
  from public.request_responses rr
  join public.requests r on r.id = rr.request_id
  where rr.id = p_response_id;

  if v_donor_id is null or v_requester_id is distinct from v_caller_id then
    return; -- no such response, or caller isn't the requester on it
  end if;

  select count(*) into v_recent_calls
  from public.donor_contact_reveal_log
  where caller_donor_id = v_caller_id
    and called_at > now() - interval '1 hour';

  if v_recent_calls >= 30 then
    return; -- defense-in-depth cap; fails closed the same as any other case
  end if;

  select d.available_now into v_available
  from public.donors d
  where d.id = v_donor_id;

  if not coalesce(v_available, false) then
    return; -- donor is no longer available right now
  end if;

  insert into public.donor_contact_reveal_log (caller_donor_id, response_id)
  values (v_caller_id, p_response_id);

  return query
    select d.phone, d.whatsapp
    from public.donors d
    where d.id = v_donor_id;
end;
$$;

revoke all on function public.get_responder_contact(uuid) from public, anon, authenticated;
grant execute on function public.get_responder_contact(uuid) to authenticated;
