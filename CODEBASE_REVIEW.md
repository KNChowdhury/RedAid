# LifelineBD Codebase Review

## Update 2026-08-29 (2) — Critical: revealed donor contact stays visible after logout — confirmed stale UI state, not an RPC hole; fixed

**Reported:** sometimes, after signing out, a donor's revealed phone number is still visible on screen. Two possible causes were flagged: (1) client-side state not cleared on sign-out (real bug, not a live security hole — the data was legitimately fetched while authenticated), or (2) the RPC/a cached response still serving contact data to an unauthenticated session (critical — would mean anon can actually get contact data).

**Verdict: scenario 1.** Confirmed via code and live testing, in that order.

**RPC lockdown confirmed live, directly, before touching any code:**
```
POST /rest/v1/rpc/get_donor_contact  (apikey + Authorization: anon key only, no user JWT)
→ HTTP 401 — {"code":"42501","message":"permission denied for function get_donor_contact"}
```
Rejected at the Postgres GRANT layer (`patch_23_donor_contact_reveal_rpc.sql` revokes execute from `public, anon, authenticated`, grants back only to `authenticated`) before the function body's own `auth.uid() is null` check even runs — both layers of the defense-in-depth hold. Scenario 2 is ruled out with direct evidence, not assumption.

**Root cause, scenario 1:**
- `App.tsx` `handleLogout` (`src/App.tsx:368-373`) clears `currentUser` but never touches `selectedProfileDonor` — if `ProfileModal` is open, it stays open showing the same donor.
- `ProfileModal`'s reveal-state reset effect (`src/components/Modals.tsx`, originally lines 608-633) only depended on `[donor]` — it fires on a donor switch, never on an auth-identity change, so a modal left open across sign-out never reset `revealedContact`.
- Same bug class already fixed once: `DonorsNetwork.tsx`'s parallel `revealedContacts` map (the grid-card reveal) already resets correctly via a dedicated `useEffect(..., [currentUserId])` (added in `b32784b`/`4edc395`). That fix was never applied to `ProfileModal`'s separate, independent reveal state — two systems solving the same problem, one patched, one not.

**Fix applied:** `ProfileModal` now takes a `currentUserId: string | null` prop (`App.tsx` passes `state.currentUser?.id ?? null`, same as `DonorsNetwork` already does) and has a new effect, keyed separately from the existing `[donor]` effect, that resets `revealedContact`/`revealingContact` (and bumps `revealVersionRef` to invalidate any in-flight reveal call) whenever `currentUserId` changes — matching `DonorsNetwork.tsx`'s existing pattern exactly instead of diverging again. `npm run lint` and `npm run build` both pass unchanged.

**Live verification, real reproduction, not assumed:**
- The literal reported steps ("open profile, reveal number, click Sign Out, check if still visible," all in one tab) turned out to be physically **impossible to trigger via a real click**: Playwright confirmed the modal's `fixed inset-0 z-50` backdrop intercepts pointer events at the Navbar's Sign Out button location — a real user cannot click Sign Out while any modal is open in this app. Retrying it live, unmodified, produces Playwright's own actionability timeout, not a click.
- Tested the realistic equivalent instead — a real, live, two-tab session (same browser context/localStorage, disposable test accounts signed up through the real signup flow against production): Tab A opens a donor's profile and reveals their number; Tab B signs out. Supabase's cross-tab auth sync correctly nulls `currentUser` in Tab A with no click on Tab A at all.
  - **Pre-fix (production, current deploy):** modal ended up closed, no number left visible.
  - **Post-fix (local dev server, patched code):** same outcome.
  - Both look safe — but the pre-fix result is **not** because of any deliberate protection; see the side-finding below. That's exactly why the deliberate fix still matters: the pre-fix safety was accidental and not something to rely on.

**Side finding — real, separate bug, not fixed in this patch:** `useDismissable(!!donor, onClose)` in `ProfileModal` is called with an **inline arrow function** (`onClose={() => setSelectedProfileDonor(null)}`), and `onClose` sits in `useDismissable`'s own effect dependency array (`src/hooks/useDismissable.ts:51`). Since that inline callback is a new reference on every `App` render, the effect tears down and re-runs — pushing and popping a browser history entry — on **every single re-render while any dismissable overlay is open**, not just on open/close transitions. Confirmed live: 4 distinct `framenavigated` events fired in Tab A during the burst of re-renders the cross-tab logout triggered. This churn is what actually closed the modal pre-fix, via a `history.back()` → `popstate` → `onClose()` cascade — not a deliberate reset. It happens to be safe here, but it's fragile (depends on enough re-renders happening in the right order) and is exactly the "unstable inline callback in an effect dependency array" pattern this file's own engineering guidelines call out to check for. Not fixed here to keep this patch scoped to the one reported issue — worth a follow-up (memoize the `onClose` passed to `useDismissable`, or drop `onClose` from that effect's deps since it's only used inside event handlers, not reactively).

**Also found, unrelated, not fixed here:** `donors.phone` has a unique constraint (`donors_phone_uniq`). `signUpDonor()`'s `23505`-conflict recovery (`src/services/lifelineService.ts` `upsertDonorRow`) re-selects the existing row by `auth_user_id` to merge in the submitted profile — but on a **phone** collision (a different account already holds that phone), that re-select naturally finds nothing (wrong `auth_user_id`), falls through, and returns the original constraint-violation error. The user sees "your account was created, but we could not finish setting up your donor profile" instead of a clear "phone number already registered" message, and is left with a confirmed `auth.users` row and no `donors` row at all. Found while creating disposable test accounts for this audit and accidentally reusing the same placeholder phone number across two of them.

**Test accounts created against production for this investigation — need deletion (auth.users + public.donors rows) from Supabase:**
- `zzz.delete.me.leakaudit@example.com`, `...2@`, `...5@`, `...6@`, `...7@example.com` — real accounts, some with a real `donors` row.
- `zzz.delete.me.leakaudit3@example.com`, `...4@example.com` — auth-only, no `donors` row (hit the phone-collision bug above).
- `zzz.delete.me.leakaudit-probe@example.com` — auth + manually-inserted donor row, used only to isolate the phone-collision bug via direct REST calls.

## Update 2026-08-29 — Memory-leak audit of the 2026-08-27 commits (no leak found in code; live reproduction confirms no leak on idle load)

**Trigger:** live-site report that the page gets noticeably heavier/laggier after
being open 3-4 minutes — a classic leak symptom. Asked to audit every
`useEffect`/`useCallback`/timer/subscription touched in the most recent day of
work (all four commits dated 2026-08-27: `ea738cc`, `4edc395`, `2309bdd`,
`e52fda2`), the same way the earlier 56,844-request infinite-loop bug was
tracked down.

**Reviewed diff-by-diff, not just grepped:**

- `App.tsx` `subscribeToAuthState` listener + `handleLoginSuccess` (`ea738cc`):
  the commit only added `if (!donor.id) return` guards *inside* the existing
  callback bodies. The effect's own shape —
  `useEffect(() => subscribeToAuthState(...), [refreshSharedData])` — was
  untouched. `subscribeToAuthState` (`lifelineService.ts:1375`) returns a
  correct cleanup (`data.subscription.unsubscribe()` plus clearing any pending
  restore `setTimeout`s), and `refreshSharedData` is a stable `useCallback`
  (deps: `notify`, itself stable through `openRequestsTab` → `setActiveTab`,
  both memoized with fixed dep arrays). No duplicate-listener registration, no
  missing cleanup.
- `DonorsNetwork.tsx` reveal-contact state (`4edc395`): new `isMountedRef` and
  `revealRequestVersionRef` effects (lines 31-41) fire once (`[]`) and on
  `currentUserId` change respectively, both with correct cleanup/guards.
  `revealContact()` is a single one-shot async RPC call — no timer, interval,
  or subscription left running after use.
- `Modals.tsx` `ProfileModal.handleRevealContact` / `getDonorContact`
  (`b0f265f`, `4edc395`): single RPC call (`lifelineService.ts:487`), guarded
  by `isMountedRef` + `revealVersionRef`. Confirmed nothing keeps running after
  the modal closes.
- `Modals.tsx` / `lifelineService.ts` validation wiring (`2309bdd`, `e52fda2`
  — `isValidDonorName`, required blood group, password length, save-error
  surfacing): plain `useState` and validation-branch additions. No new
  effects, no dependency-array changes anywhere in these two commits.

**Conclusion on the code:** no interval, timeout, listener, or subscription
was added or left uncleaned in any of the four commits from that session.
Every effect touched either had no dependency-array change, or was already
correctly guarded before these diffs landed (verified against the
pre-existing lines around each hunk, not just the added lines).

**Live reproduction — real measurement, not a guess.** Installed `playwright`
as a devDependency (confirmed it does not affect the production
build/bundle: `npm run lint` and `npm run build` both pass unchanged after
install, output chunk sizes match the pre-existing baseline in L1 below), and
drove headless Chromium against `https://lifelinebd.vercel.app/` (the site's
default "Donors Network" landing tab, guest/logged-out) for 5 minutes idle —
no clicks, no interaction, matching the reported "gets heavier after 3-4
minutes" scenario. Sampled via the CDP `Performance`/`HeapProfiler` domains
every 30s, forcing a real GC (`HeapProfiler.collectGarbage`) immediately
before each read so the numbers reflect retained memory, not memory merely
eligible for collection:

| t (s) | heap used (MB) | heap total (MB) | DOM nodes | JS listeners | documents |
|-------|----------------|------------------|-----------|---------------|-----------|
| 0     | 2.72 | 3.25 | 846 | 231 | 1 |
| 30    | 2.74 | 3.25 | 846 | 231 | 1 |
| 60    | 2.75 | 3.25 | 846 | 231 | 1 |
| 90    | 2.75 | 3.25 | 846 | 231 | 1 |
| 120   | 2.76 | 3.25 | 846 | 231 | 1 |
| 150   | 2.77 | 3.25 | 846 | 231 | 1 |
| 180   | 2.78 | 3.25 | 846 | 231 | 1 |
| 210   | 2.78 | 3.25 | 846 | 231 | 1 |
| 240   | 2.78 | 3.25 | 846 | 231 | 1 |
| 270   | 2.78 | 3.25 | 846 | 231 | 1 |
| 300   | 2.78 | 3.25 | 846 | 231 | 1 |

**Verdict: no leak on this path.** DOM node count and JS event listener count
are bit-for-bit flat for the entire 5 minutes (846 / 231, never once
changing) — the strongest possible signal against an accumulating
listener/subscription/DOM-node leak. Post-GC heap rises a total of 0.06 MB
(60 KB) over 300 seconds, front-loaded in the first 3 minutes and dead flat
for the last 2 (180s-300s all read 2.78 MB) — a one-time settling
(lazy-initialized module state, e.g. Supabase client internals), not
unbounded growth. This is not even a sawtooth; there was nothing to collect.
No console errors were observed during the window either.

**Scope limit — this covers idle-on-landing-page as a guest, nothing else.**
Headless Chromium has no session, so this run never exercised a logged-in
donor, opening/closing `ProfileModal` or the contact-reveal flow repeatedly,
switching tabs, or a long-lived authenticated session — none of which are
ruled out by this result. If the reported heaviness only shows up signed in,
or only after specific interactions (reveal contact, tab switching, opening
modals repeatedly), that needs a follow-up run exercising those actions
specifically — happy to script that next if useful, given a test account.
`playwright` is left installed as a devDependency for that or any future
browser smoke test (ties into M1 below, which flags the lack of one) —
say the word if you'd rather I revert the install instead.

**Where to look next if the symptom persists and isn't in this session's
diff:** `subscribeToLiveUpdates` / `subscribeToNotifications` channel
lifecycle (`lifelineService.ts:979-1023`, unchanged in this session), and any
component not touched on 2026-08-27 — `SidebarStats.tsx`, `RewardsHub.tsx`,
`HospitalPortal.tsx`, `SuccessStories.tsx` — none of which were in scope for
this pass.

## Known issue, not urgent — null `donor_id` race during signup (2026-08-25)

Found while UI-testing the signup flow (blood-group-required fix + donor-write
trigger fix, both confirmed working). Not a regression from either of those
fixes — a pre-existing race, observed but not investigated further, and not
blocking anything: the signed-up user still ends up correctly authenticated.

**Symptom:** one console error during a successful signup:
```
Fetch health info error: invalid input syntax for type uuid: "null"
GET .../rest/v1/donor_health?select=*&donor_id=eq.null
```

**Likely mechanism:** `signUpDonor()` (`src/services/lifelineService.ts`)
inserts the donor row and then calls `fetchMyHealthInfo(signedUpProfile.id)`,
while `subscribeToAuthState`'s `onAuthStateChange` listener independently
calls `getCurrentDonorFromSession()` in parallel (see the comment at
`lifelineService.ts` around line 1116). Both race to create/resolve the same
donor row. Evidence from the network log: three initial `donors?...
auth_user_id=eq...` lookups, a `link_or_get_my_donor` RPC call, the
insert, and then `donor_health?...donor_id=eq.null` — one side of the race
called `fetchMyHealthInfo` with `null`/undefined before its own donor id had
resolved; the other side (the listener) resolved a real id and won, and the
user ended up correctly signed in.

**Fix, not done, not urgent:** trace both call sites' timing precisely and
either await a single source of truth for the donor id before calling
`fetchMyHealthInfo`, or guard `fetchMyHealthInfo` against a null/undefined id
and no-op instead of firing the request.

## Update 2026-08-25 — Live donor-contact-reveal vulnerability (Critical, confirmed deployed)

Since the 2026-08-23 review below, local `main` and `origin/main` diverged from
common ancestor `c53c76b`. Local-only commit `9d99c90` added a *relationship-
scoped* contact-reveal RPC (`get_responder_contact` — only reveals a donor's
number to the requester whose request that donor answered). A separate,
unmerged line of commits on `origin/main` (`733d6af`, `b0f265f`, `b32784b`)
independently added a *second*, open-directory RPC (`get_donor_contact`) with
no relationship check at all — gated only on "authenticated, donor
available_now, not yourself, under 50 calls/hour."

**Confirmed via `curl` against the production Vercel bundle
(`https://lifelinebd.vercel.app/assets/index-*.js`):** the deployed site
contains `get_donor_contact` and does **not** contain `get_responder_contact`
anywhere in the bundle. The vulnerable, unmerged `origin/main` branch — not
local `main` — is what real users are getting today.

**Confirmed via anon-key PostgREST probes against the live Supabase project:**
both `get_donor_contact` and its audit table exist live (`42501` permission
denied for anon = deployed and correctly anon-gated, but callable by any
`authenticated` account). Donor `id`s needed to call it are already public via
`v_public_donors`/`v_donors_directory`.

### Critical

- **C1 — `get_donor_contact` (patch_23) lets any signed-up account harvest any
  available donor's phone/WhatsApp.** No check ties the caller to the donor —
  only availability + self-exclusion + a 50/hour rate limit gate it. Since
  donor IDs are public, this is a directory-scraping vector: sign up once,
  script through `v_public_donors`, call `get_donor_contact` on every
  `available_now` donor, repeat hourly or with more accounts. This is the
  exact scenario patch_21's own incident writeup warned against, just moved
  from "anon" to "any free signup." **Live and exploitable right now.**
  Fix: either add a request/response relationship check to `get_donor_contact`
  itself, or retire it and route `DonorsNetwork.tsx`/`Modals.tsx`'s "Show
  number" through the existing `get_responder_contact` model. Two RPCs
  solving "reveal a donor's contact" with different trust models is itself
  the defect — keep one.
- **C2 — Wrong branch is in production.** Vercel is building from
  `origin/main` (the vulnerable branch), not local `main` (the fixed one).
  Before any other fix: confirm in the Vercel dashboard which commit is live,
  then reconcile the two histories deliberately (do not force-push either
  direction — that silently discards one side's work).

### High

- **H1 — `ProfileModal.handleRevealContact` (`src/components/Modals.tsx`,
  `origin/main`) has a stale-closure bug.** `ProfileModal` is a single
  persistent instance (no `key`) reused across different donors. Its reveal
  handler closes over `donor.id` with only an `isMountedRef` guard — which
  stays `true` across a donor switch, so it doesn't catch the case. Opening
  donor A, clicking "Show number," then switching to donor B before A's
  request resolves shows **A's phone number labeled as B's**. `DonorsNetwork.
  tsx` already has the correct fix for this exact class of bug
  (`revealRequestVersionRef`, added in `b32784b`) — it was never applied to
  `ProfileModal`. Fix: add the same generation-ref pattern, keyed to
  `donor.id`.
- **H2 — Leftover hardcoded debug branch targeting a real user.**
  `src/components/DonorsNetwork.tsx`: `if (donor.name === 'MIlad' ||
  donor.name === 'Milad') { console.log('MIlad data:', {...}) }` — present
  in the live production bundle. Delete it; no shipped code should branch on
  a literal developer's name.
- **H3 — Governance file edited alongside the vulnerable commit.** `733d6af`
  (the same commit introducing `get_donor_contact`) also appended a "Staff-
  engineer practices" section to `CLAUDE.md`. Content itself is benign
  generic engineering advice, not present on local `main`, and did not affect
  this review — flagged only as a process concern: a commit that touches
  engineering-instruction files bundled with a security-sensitive RPC change
  deserves its own review pass.

### Medium

- **M1 — `MarkDonatedModal.handleRevealContact` (`DonationLoop.tsx`) has no
  mount/cancellation guard**, unlike the rest of that file. Lower severity
  than H1 — `responseId` keys are unique per request, so no cross-request
  misattribution, just a possible post-unmount `setState` warning.
- **M2 — `v_donors_directory` is reachable by `anon`** despite patch_17/20
  documenting it as authenticated-only (confirmed via live probe: 200 with
  data, not 401/42501). In practice it exposes nothing `v_public_donors`
  doesn't already expose to anon, but the intended guest/authenticated
  separation isn't actually enforced at the grant layer — same class of
  drift as the patch_21 phone-column incident. Either revoke anon select or
  update the docs to say it's intentionally shared.

### Patch live-state audit (03–23)

Confirmed live and correct via anon-key probes: patch_03/17/20 (no phone/
whatsapp columns), patch_04/05 (notification outbox blocked for anon),
patch_18/20 (completed-donation feed clean), patch_19 (anon execute revoked
on `record_donation`/`confirm_my_donation`/`is_admin`/`current_donor_id`/
`link_or_get_my_donor`), patch_21 (columns dropped), patch_22
(`get_responder_contact` deployed, anon-denied — note it takes
`p_response_id`, not `p_donor_id`), patch_23 (`get_donor_contact` deployed —
see C1, this is a "deployed and vulnerable" confirmation, not "deployed and
safe"). No patch found to be silently un-applied beyond what's stated above.

Cannot confirm without a service-role key (open, not guessed): patch_05/09/
11/12/13/15's exact live RLS policy text (anon-role *behavior* is consistent
with them being applied, but that's not proof of the exact policy shape),
and patch_06/07/10's donation double-credit guard internals (the RPC exists
and anon is denied; the idempotency logic itself isn't observable via anon
probing).

### Not regressed since 2026-08-23 review (re-checked on local `main` HEAD)

Request-storm mitigation (single-flight + debounce), stale-result guards,
realtime channel cleanup, and the donation double-crediting guard
(`confirm_my_donation`'s `credited` check + client-side `busyId` disable) all
still hold on local `main`. No raw PII found in any `console.*` call on local
`main` — the only PII-adjacent debug log found anywhere is H2 above, which is
`origin/main`-only.

### Fix order

1. C2 — confirm and fix what Vercel is actually serving.
2. C1 — close the relationship-check gap in `get_donor_contact` (or retire it).
3. H1 — generation guard in `ProfileModal`.
4. H2 — delete the debug branch.
5. M2 — decide the `v_donors_directory` anon-grant question.
6. H3, M1 — process/hygiene, no urgency.

---

Review date: 2026-08-23

## Scope

Reviewed the React/Vite client, lifecycle and Supabase service code, realtime/auth subscriptions, SQL policy/migration files, and package scripts. The reported production symptom is a browser tab that becomes unresponsive and closes, with repeated Supabase requests showing `net::ERR_INSUFFICIENT_RESOURCES`.

## Executive Summary

The strongest code-level explanation for the browser failure is a request storm caused by overlapping startup, auth, and realtime refreshes. The client now has a single-flight guard and a 150 ms realtime debounce in `src/App.tsx`, but the deployed site still needs a hard-reload Network-panel verification because the screenshot alone cannot prove which callback started every request.

No persistent event-listener or realtime-channel leak was confirmed in the inspected paths: the existing effects return cleanup functions. A cleanup gap was found for a share-modal timer and for queued auth timers; both have been addressed. Several async stale-result and database-policy risks remain and should be fixed in the order below.

## Critical

### C1. Browser resource exhaustion from repeated shared-data requests

- Location: `src/App.tsx`, `refreshSharedData` and the live-update effect.
- Evidence: one shared refresh launches three Supabase GET requests (`v_public_donors` or `v_donors_directory`, `requests`, and `badges`). The screenshot shows those groups repeating until `net::ERR_INSUFFICIENT_RESOURCES`.
- Impact: browser connection/socket exhaustion, a hung tab, and possible forced tab termination.
- Status: Mitigated in the working tree with single-flight request deduplication and a 150 ms realtime debounce. Runtime confirmation on the deployed URL is still required.
- Discriminating check: hard reload with Network recording enabled; count request groups during startup, auth transition, and a burst of realtime changes. There should be no unbounded increase.

## High

### H1. Async effects can publish stale results after unmount or identity changes

- Locations: `src/App.tsx` startup restore and notification fetch; `refreshLoopData`; `src/components/DonationLoop.tsx` responder fetch.
- Evidence: these async calls update React state after awaiting without an abort signal or cancellation flag.
- Impact: stale user data can overwrite current data after logout/login, and unmounted views can continue work and produce state-update warnings.
- Status: Fixed in the working tree with mounted/cancellation guards for startup restore, notifications, loop data, and responder loading. AbortSignal support remains a future improvement where the service API can accept it.

### H2. Realtime callbacks can start work after the UI state they captured is obsolete

- Location: `src/App.tsx`, live-update effect callbacks.
- Evidence: callbacks capture login state and impact score, while the effect intentionally omits those values from its dependency list.
- Impact: a transition between guest and authenticated views can briefly refresh with the wrong data source or user points.
- Status: Fixed in the working tree: realtime scheduling reads the current donor ref and keeps one subscription per auth identity. Runtime auth-transition verification is still recommended.

### H3. Duplicate and overlapping permissive RLS policies remain in migration history/current risk surface

- Locations: `patch_12_rls_performance.sql`, `patch_15_consolidate_duplicate_policies.sql`, `audit_rls_policies.sql`.
- Evidence: patch 12 explicitly documents near-identical overlapping policies on donors, notifications, and request responses; permissive policies OR together.
- Impact: a later policy can unintentionally widen access even when an individual policy looks restrictive; security behavior is difficult to audit.
- Recommended fix: run `audit_rls_policies.sql` against the live project, consolidate each table to one intentional policy per operation, then run `verify_patches.sql` and misuse tests for anon/authenticated/admin roles.
- Status: The repository migration is now rerunnable: `patch_15_consolidate_duplicate_policies.sql` drops `donor_health_own_or_admin` before recreating it. The live SQL Editor must rerun the corrected patch and then run the audit.

### H5. Donor directory view uses SECURITY DEFINER

- Location: `patch_03_health_privacy.sql` and `patch_17_donor_directory_birth_year.sql`, `v_donors_directory`.
- Evidence: the view intentionally projects safe donor columns while the base `donors` table is restricted; PostgreSQL's default view behavior is security definer, which the Supabase advisor flags.
- Impact: changing it directly to `security_invoker` would make the existing donor directory obey base-table row RLS and likely hide other donors; leaving it unchanged requires confirming the view owner, grants, and exact projection in the live database.
- Status: Remediated in `patch_20_security_invoker_public_feeds.sql`. It moves donor and completed-donation public fields into safe projection tables, synchronizes them with restricted trigger functions, and recreates all three views with `security_invoker = true`. Run the patch, then `inspect_view_definitions.sql` and test anon/authenticated access against both the views and the base tables.

### H6. SECURITY DEFINER RPCs are exposed to authenticated users

- Locations: public RPCs reported by the Supabase linter: `confirm_my_donation`, `current_donor_id`, `is_admin`, `link_or_get_my_donor`, `offer_to_donate`, `record_donation`, and `verify_donation`.
- Evidence: the linter reports authenticated `EXECUTE` privilege for each function.
- Impact: authenticated users can invoke these endpoints, so authorization must be enforced inside each function; client-side restrictions are not sufficient.
- Status: `patch_19_security_advisor_hardening.sql` revokes `public` and `anon` execution and preserves authenticated execution only where the app/RLS workflow requires it. The SQL must be run and its verification query reviewed in Supabase.

### H7. Leaked Password Protection is disabled

- Location: Supabase Auth project settings, reported by the supplied linter export.
- Impact: users may choose passwords known to have appeared in compromised-password databases.
- Status: Requires enabling leaked-password protection in Supabase Dashboard under Auth password security; this cannot be changed from the frontend repository.

### H4. Transient Supabase failures are represented as empty data

- Location: `src/services/lifelineService.ts`, `fetchSharedData`.
- Evidence: each failed query is logged, then its error becomes `data || []` and the caller replaces current state with the empty result.
- Impact: a temporary outage can erase the visible donor/request feed and make users think data was deleted; realtime failures may cause repeated recovery attempts elsewhere.
- Status: Fixed in the working tree: query errors now throw to the refresh boundary, so failed queries preserve the last-known-good feed instead of replacing it with empty arrays. A typed result can be added later without changing behavior.

## Medium

### M1. No automated test script exists for the highest-risk behavior

- Location: `package.json`.
- Evidence: scripts provide `dev`, `build`, `preview`, `clean`, and `lint`, but no unit, integration, browser, or SQL verification command.
- Impact: request-loop, auth-transition, realtime cleanup, and donation idempotency regressions can return unnoticed.
- Recommended fix: add focused tests for refresh deduplication, effect cleanup, auth transitions, and database RPC idempotency; add a repeatable browser smoke test.
- Status: Still open. The repository has no test runner or browser automation dependency, so this was not papered over with a fake test command. `npm run lint` and `npm run build` remain the current gates.

### M2. Several service and state boundaries use `any`

- Locations: `src/services/lifelineService.ts`, `src/App.tsx`, and donation/notification components.
- Evidence: database rows, pending confirmations, and notification payloads cross boundaries as `any`.
- Impact: schema drift or nullable fields can become runtime failures that TypeScript cannot catch, especially in privacy-sensitive views.
- Recommended fix: define narrow row types and map/validate them at the service boundary.

### M3. Notification and fetch effects need stale-response ordering protection

- Locations: `src/App.tsx` notification loading and loop data refresh.
- Evidence: this was present before the fix; an older request could resolve after a newer donor identity/request refresh and still call `setState`.
- Impact: logout/login races may show another donor's notifications or offered-request state briefly.
- Status: Fixed in the working tree with cancellation and generation guards keyed to the active donor refresh.

## Low

### L1. Production bundle exceeds the Vite warning threshold

- Location: `package.json` build output.
- Evidence: the production JavaScript chunk is about 701 kB before gzip and triggers the 500 kB warning.
- Impact: slower initial load on mobile networks; not the direct cause of the request exhaustion error.
- Status: Partially fixed in the working tree with explicit React, Supabase, charts, and motion vendor chunks. Lazy-loading route-specific views remains a further optimization if the app chunk still exceeds the target after deployment.

### L2. Local-storage persistence is synchronous and unvalidated

- Location: `src/services/lifelineService.ts`, `getAppState` and `saveAppState`.
- Evidence: large state is serialized and written during a state effect; malformed JSON is caught, but parsed shape and storage quota errors are not fully handled.
- Impact: main-thread stalls or a storage exception can interrupt rendering/persistence.
- Recommended fix: validate the parsed shape, cap persisted collections, and catch quota/security exceptions with a non-fatal fallback.

### L3. Audit snapshot reported form metadata and mobile viewport gaps

- Locations: auth/request/donation/sidebar form components and `src/App.tsx`.
- Evidence: the supplied live audit reported unnamed fields, unassociated labels, and `100vh`-style viewport behavior.
- Status: Fixed in the working tree with stable field IDs/names, associated labels, accessible icon-button names, `100dvh` layout units, and cached district loading.

### L4. Shared query payloads were broader than necessary

- Location: `src/services/lifelineService.ts`, `fetchSharedData`.
- Status: Fixed in the working tree by selecting only mapper-consumed columns for donor directory, requests, and badges. Private profile reads still use full rows where the authenticated workflow requires them.

### H8. Browser storage contained a cached public donor/request snapshot

- Location: `src/services/lifelineService.ts`, `getAppState` and `saveAppState`.
- Evidence: the supplied live audit found `LIFELINE_BD_STATE_V3` in localStorage containing donor names, blood groups, locations, and request data.
- Status: Fixed in the working tree. Startup removes the legacy key and state persistence no longer writes donor, request, location, health, or notification data to localStorage. The app reloads current data from Supabase.

### H9. Content Security Policy was missing

- Location: `vercel.json`.
- Status: Fixed in the working tree with a Vercel CSP plus `X-Content-Type-Options`, `Referrer-Policy`, and `X-Frame-Options`. The deployed response headers still need verification after redeploy.

## Fix Order

1. Verify the deployed request count and confirm the request-storm mitigation in production.
2. Add stale-result cancellation to auth, notifications, loop data, and modal fetches.
3. Audit and consolidate live RLS policies with Supabase SQL verification.
4. Preserve last-known-good UI data on failed shared queries.
5. Add browser and database regression tests.
6. Address bundle splitting and storage hardening.

## Verification Performed

- Read the current `App.tsx`, `lifelineService.ts`, lifecycle hooks, and relevant components.
- Searched for timers, intervals, event listeners, effects, callbacks, and subscriptions.
- Read the RLS audit and performance migration SQL.
- `npm run lint` passed.
- `npm run build` passed; Vite reported only the existing large-chunk warning.
- `git diff --check` reported no patch errors; only the repository's LF/CRLF conversion warning.
- Editor diagnostics reported no errors in the three changed TypeScript files.
- Existing `patch_15_consolidate_duplicate_policies.sql` was reviewed as the repository's RLS consolidation migration; it still requires live execution and post-migration `audit_rls_policies.sql` verification.
- Supplied Supabase linter results were reviewed for three SECURITY DEFINER views, seven authenticated SECURITY DEFINER RPCs, and disabled leaked-password protection.
- `patch_20_security_invoker_public_feeds.sql` passed local structural checks: two projection tables, three invoker views, and four trigger functions were found; live SQL execution remains required.
- Supplied performance audit reported healthy heap/DOM metrics, high API latency, duplicate public-feed requests, two unnamed buttons, broad `select=*`, and mobile viewport risk. The code-level findings are now addressed; deployed Network/Issues recheck is still required.
- Supplied principle-engineer audit reported no immediate heap/DOM leak, but flagged browser storage PII and missing CSP. Both code/config findings are now addressed; live header and clean-storage verification remains required.

The request-storm diagnosis is high-confidence from the repeated request pattern and call structure, but production runtime confirmation is still required before calling it fully resolved.
