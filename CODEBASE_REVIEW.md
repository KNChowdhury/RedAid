# LifelineBD Codebase Review

## Update 2026-09-17 — Navbar overlap fix, guest sign-in gating, Google Sign-In, and two real bugs found via regression testing

**1. Navbar overlap at the `xl` breakpoint (fixed).** At ~1280px width, "Rewards" rendered directly behind/under the "REQUEST BLOOD" button. Root cause: `Navbar.tsx`'s header used `justify-between` with no `gap`, so nothing guaranteed minimum spacing between the desktop nav and the right-side actions — `justify-between` only distributes *extra* space when there is any. Fixed with `gap-4 lg:gap-6` on the header. Verified visually at 375/640/800/1024/1280/1300/1366/1440/1536px — clean at every width, no regression at narrower breakpoints.

**2. Guests clicking "Show number" now get prompted to sign in, instead of a misleading "Not available right now."** Previously, `getDonorContact()` silently caught the RPC's `401` rejection and returned `null`, which the UI displayed identically to "this donor really isn't available" — misleading a guest into thinking an available donor wasn't reachable, when they just weren't signed in. Both reveal paths (`DonorsNetwork.tsx`'s grid cards and `Modals.tsx`'s `ProfileModal`) now check `currentUserId` first and call a new `onRequireAuth` prop instead of hitting the RPC at all. `ProfileModal`'s version also closes itself when doing this (`setSelectedProfileDonor(null)` alongside opening `AuthModal`), matching the pattern `RequestBloodModal`'s guest flow already used — leaving it open would otherwise stack two modals with unpredictable z-order.

**3. Google Sign-In added (code-complete; needs external configuration to work end-to-end).** `signInWithGoogle()` in `lifelineService.ts` calls `supabase.auth.signInWithOAuth({ provider: 'google' })`; a "Continue with Google" button was added to `AuthModal` on both the login and register views. **This requires enabling the Google provider in the Supabase Dashboard (Authentication → Providers) with a real Google Cloud OAuth Client ID/Secret and correct redirect URLs — confirmed live that this isn't done yet** (clicking the button currently returns `{"code":400,"error_code":"validation_failed","msg":"Unsupported provider: provider is not enabled"}`). The button and redirect-handling code are otherwise verified working (button renders on both views, click reaches Supabase, returns the expected not-yet-configured error rather than crashing).

**4. New "complete your profile" gate for accounts with no required fields yet.** A Google/OAuth/magic-link sign-in has no blood group, phone, or district — `getCurrentDonorFromSession()`'s existing fallback insert (pre-existing behavior, unchanged) already creates a bare donor row so login itself doesn't get stuck, but that row was previously usable as-is with blank required fields. `App.tsx` now derives `needsProfileCompletion` (`!!currentUser && (!phone || !district || !area)`) and renders a new, deliberately non-dismissable `CompleteProfileModal` (`Modals.tsx`) when true, backed by a new `completeDonorProfile()` service function (an `UPDATE` on the existing row, not a second insert path). **Not live-tested end-to-end** (would need an account with no donor row to begin with, e.g. via magic-link or Google once configured) — verified only that it does *not* falsely trigger for any complete account, and that it typechecks/builds.

**5. Two real, pre-existing bugs found and fixed while regression-testing the above (both via live reproduction, not just code reading):**
- **`DonorsNetwork.tsx`'s `isMountedRef` never reset to `true` on mount** — only `false` in the effect's cleanup. Under React 19 StrictMode's dev-only mount→unmount→remount cycle, this left it permanently `false` after the very first render, silently no-op'ing `revealContact()` (and anything else gated on it) for the lifetime of the component *in development only* — production builds were never affected (StrictMode's double-invoke is dev-only). Caught because a guest-reveal regression test failed with no visible cause until direct instrumentation showed the guard was blocking on a stale ref. Fixed to match `ProfileModal`'s already-correct version of the same pattern (which explicitly sets `isMountedRef.current = true` in the effect body).
- **`useDismissable`'s `history.back()` is asynchronous, and races when two overlays transition in the same render.** Closing `ProfileModal` while opening `AuthModal` in one handler (the guest-reveal-inside-profile fix, item 2 above) exposed it: `ProfileModal`'s cleanup calls `history.back()` (queued, not immediate), then `AuthModal`'s effect synchronously pushes its own history marker before that queued `back()` resolves. When it finally fires, it pops `AuthModal`'s fresh entry instead of `ProfileModal`'s old one, which fires `AuthModal`'s own `popstate` listener and closes it immediately after it opened. Root-caused via direct instrumentation of every `useDismissable` call site (temporarily tagged to trace exact firing order) — reading the code alone did not surface this, it required watching the actual event sequence. Fixed by replacing the close-time `history.back()` with a synchronous `history.replaceState()` (restoring the previous entry directly; only an actual physical back-navigation still goes through `history.back()`, and that path never calls it again itself), plus a unique-per-open marker id so a sibling overlay's marker can never be mistaken for one's own. This is a shared hook used by 4 modals (`RequestBloodModal`, `AuthModal`, `ProfileModal`, `NotificationsModal`) — the existing guest-guard on `RequestBloodModal` (`setIsRequestModalOpen(false); setIsAuthModalOpen(true);`) likely had this exact same latent bug already; this fix covers that path too, though it wasn't separately re-tested after the fix.

**Regression suite run against a local dev server with the patched code (Playwright, 7/7 passing after the two bug fixes above):** guest grid reveal opens sign-in; guest `ProfileModal` reveal opens sign-in (and closes the profile modal cleanly); "Continue with Google" renders on both login and register views; a fresh complete signup does *not* trigger the profile-completion gate; and a signed-in reveal-contact still works end-to-end (real phone number + WhatsApp link rendered). `npm run lint` and `npm run build` both pass.

**Housekeeping:** `zzz.delete.me.leakaudit8@example.com` was created during this regression pass (a complete, real signup) and needs the same cleanup as the earlier `zzz.delete.me.leakaudit*` test accounts. Separately confirmed live: `zzz.delete.me.leakaudit6@example.com`'s `donors` row is already gone (auth still resolves, no matching row) — consistent with earlier test-account cleanup already having started.

## Update 2026-08-29 (3) — General senior-engineer pass over previously out-of-scope components + re-verification of prior fixes

Requested as a general "review the codebase" pass, not tied to one symptom. App
code is unchanged since the last commit (`0a0462d`) — only `CLAUDE.md` had an
uncommitted addition and a leftover script (`heap-signedin-tmp.mjs`) sat
untracked, both addressed at the end of this entry. Re-verified the prior
update's fix live in code (not repeated) and read every component the
memory-leak audit explicitly marked out of scope: `SidebarStats.tsx`,
`RewardsHub.tsx`, `HospitalPortal.tsx`, `SuccessStories.tsx`,
`AdminDashboard.tsx`, `EmergencyFeed.tsx`, `Navbar.tsx`, `Avatar.tsx`,
`AreaField.tsx`, `CompactSelect.tsx`, and the hooks.

### Critical (hypothesis — confirmed from repo alone as far as it goes; needs a live Supabase check to close)

**`verify_donation()`, the hospital-side donation-crediting RPC, has never had its source committed to this repo, across two separate incidents — and it is the most likely real root cause of today's `beyourbestbd` double-crediting recurrence, not the legacy trigger CLAUDE.md's new entry attributes it to.**

Evidence, all from the repo alone:
- `grep -r verify_donation` across the whole repo turns up only *callers* (`HospitalPortal.tsx:64`, `lifelineService.ts:890-908`) and grant/revoke statements (`patch_19`). No `create function public.verify_donation` exists in any `patch_NN_*.sql` file — confirmed by `patch_07`'s own predecessor investigation, which left behind `inspect_donation_crediting.sql`, `inspect_donor_credit_history.sql`, and `inspect_functions_fallback.sql` specifically to pull the missing source (commit `55c42ab`, 2026-08-22), and by `patch_10`'s comment: *"apply_donation() itself... its body was never fully retrieved from the live database"* — that one is a different, disabled function, but `verify_donation` is live and still has the same gap.
- `verify_donation(p_request_id, p_donor_id, p_units)` is called with a **request + donor pair**, not a `donation_id` — unlike `confirm_my_donation(p_donation_id)`, which is the function proven idempotent in `patch_07` (`if rec.credited then return rec;`). A function keyed on request+donor rather than an existing row is the shape of a function that `insert`s its own `donation_records` row rather than updating one `record_donation` already created for the same real-world donation.
- `inspect_donor_credit_history.sql` (also from the Aug 22 investigation, still sitting in the repo, never marked resolved) asks exactly this question: *"Was this same request/donor pair ever routed through BOTH flows... If verify_donation writes its own donation_records row rather than updating record_donation's row, the same real-world donation could show up twice."* That question was never answered in this repo — no follow-up patch or review entry closes it.
- **The Aug 22 fix (`patch_10`) can't explain a recurrence a week later.** `patch_10` dropped the legacy `donation_records_apply` trigger and manually corrected the one donor it affected. CLAUDE.md's own new entry (still uncommitted — see Housekeeping below) documents a **second** double-crediting incident for `beyourbestbd`, dated 2026-08-29, with `impact_score` at 1000 (expected 600) and `lives_saved` at 12 (expected 4) — i.e. 400 extra points and 8 extra lives credited. If the Aug 22 trigger removal had been the actual fix, this shouldn't have been possible to reproduce a week later through a *different* code path. The dual-write-path risk `verify_donation` represents is the one mechanism in this codebase that's still unaccounted for.
- `HospitalPortal.tsx`'s "Verify Donation" button (`handleVerify`, line 61) has only a client-side `disabled={verifying === ...}` guard — no evidence anywhere in the repo that `verify_donation` itself checks for an already-credited record for that request/donor before crediting again, the way `confirm_my_donation` does.

**This is flagged as a hypothesis, not a confirmed root cause** — I don't have Supabase credentials in this session to query the live function body or `donation_records` table directly. It's strong enough to prioritize over everything else below because it's donation-crediting integrity in a live production app, and because the tooling to close it already exists and was written for exactly this purpose:
- **Disproving/confirming query, ready to run as-is:** `inspect_donation_crediting.sql` query 3 (pulls `verify_donation`'s actual source) and query 4 (any donor credited more than once). Run both in the Supabase SQL Editor and paste the results back — that either confirms `verify_donation` double-writes, or rules it out and points elsewhere.
- **Recommended fix, pending that confirmation:** make `verify_donation` idempotent the same way `confirm_my_donation` is — check for an existing `donation_records` row for that `(request_id, donor_id)` pair first (reusing/crediting it once) instead of unconditionally inserting a new credited row — and commit its full source into a new `patch_25_*.sql` so this stops being an object nobody can inspect without live DB access. This is exactly the "two donation-crediting mechanisms conflicting" failure mode `CLAUDE.md` already names from the `patch_20`/`patch_21` incident, recurring in a different pair of functions.

### Medium

- **`useDismissable`'s inline-`onClose` re-render churn (previously flagged only as a `ProfileModal`-specific side finding) is confirmed app-wide, not isolated.** Every one of the 6 call sites (`Modals.tsx:66,311,648,990` — `RequestBloodModal`, `AuthModal`, `ProfileModal`, `NotificationsModal` — and `DonationLoop.tsx`'s `MarkDonatedModal`/`ShareRequestModal`) is driven by an `onClose` prop that `App.tsx` passes as a fresh inline arrow function on every render (`onClose={() => setSelectedProfileDonor(null)}` and five siblings, `App.tsx:590-640`). Since `useDismissable`'s effect (`useDismissable.ts:51`) has `onClose` in its dependency array, **any** re-render of `App` while **any** overlay is open tears down and re-runs the effect: pops/repushes a `history` entry, removes/re-adds the `popstate`/`keydown` listeners, and toggles `document.body.style.overflow` off-then-on. This was only caught before because a cross-tab logout happened to produce enough churn to trip the `history.back()` cascade and close `ProfileModal`; the same mechanism fires on any state update at all while a modal is open (a realtime donor/request update, a notification count changing, a filter change), for every modal in the app, not just that one path.
  - Recommended fix: change `useDismissable` to hold the latest `onClose` in a `ref` (updated every render, not depended on) and drop `onClose` from the effect's dependency array, so the effect only actually runs on real `isOpen` transitions. One fix in the shared hook covers all 6 current call sites and any future one, instead of requiring every call site to remember to `useCallback` its `onClose`.
  - Disproving test: with any modal open, trigger an unrelated `App` re-render (e.g. wait for a realtime tick, or toggle a sidebar filter with the modal open in another code path) and watch `window.history.length` / a `popstate` listener log — it should not change at all while the modal stays open under the fix, and does change today.

### Low

- **`AdminDashboard.tsx` shows fabricated infrastructure telemetry to real admins, and computes two real numbers it never uses.** The "API Infrastructure Status" panel (lines 120-144) hardcodes `Django Backend Health`, `PostgreSQL Connection pool & Firebase Cloud Messaging (FCM) push worker thread status`, `DB LATENCY 4.2 ms`, `FCM PUSH ACTIVE`, `CACHE: Redis OK` — none of which exist in this stack (it's Vite/React + Supabase; no Django, no FCM, no Redis anywhere else in the repo). The "Total Network Users" tile pads the real `donors.length` with `+ 180` and a hardcoded `↑ 18% growth this month`; "Emergency Fulfillment" (92.4%), "Verified Hospital Nodes" (42), and "Lives Saved Telemetry" (1,480+) are all hardcoded too. Meanwhile `totalDonations` (line 21) and `fulfilledRequests` (line 22, computed from the real `requests` prop) are both dead — assigned, never read anywhere in the component. An admin governance screen presenting invented numbers as live system health is a trust problem even without being a security bug; low severity only because nothing reads these values downstream.
  - Recommended fix: either wire these tiles to real data (`fulfilledRequests`/`requests.length` for fulfillment rate, drop the infrastructure panel entirely since none of it reflects the actual stack) or clearly label the panel as illustrative/placeholder. Either way, delete the two dead variables or use them.

### Housekeeping (uncommitted working-tree state, not app code)

- **`CLAUDE.md`'s uncommitted addition** (the "Manual data fixes must mirror the full atomic change" section, documenting today's `beyourbestbd` partial-fix incident) is well-formed and consistent with this file's existing incident-writeup style — worth committing. Consider folding in a pointer to the `verify_donation` hypothesis above once it's confirmed, since it may be the real mechanism behind the incident that section describes. Left uncommitted here — not committing without being asked.
- **`heap-signedin-tmp.mjs`**: gone by the time this entry was finalized (removed outside this session before cleanup was attempted here) — no action needed.

### Fix status — Medium and Low items above

- **`useDismissable` ref fix: done, verified live, not just by inspection.** `src/hooks/useDismissable.ts` now keeps `onClose` in a ref updated every render and depends only on `[isOpen]`. `npm run lint` and `npm run build` both pass. Live-verified in the dev server: instrumented `window.addEventListener`/`removeEventListener` to count `popstate` churn, opened `ProfileModal`, then forced an unrelated `App` re-render (clicked the sidebar's "B+" blood-group filter chip via a direct DOM `.click()`, bypassing the modal backdrop's pointer-events block, which changes `filters` state and re-renders `App` with a fresh inline `onClose`) — listener add/remove counts stayed at `0/0` and `history.length`/`history.state` didn't change, where the old code would have torn down and re-added the listener. Escape-to-close and X-button-close both still correctly balance the history stack afterward (`state` back to `null`, no extra back-tap needed).
- **`AdminDashboard.tsx` fake-metrics/dead-code cleanup: done, typechecked and built, not yet visually verified** (would need an admin account against real data to see the panel render, which wasn't attempted this pass). Replaced the four stat tiles with values derived from props already passed in (`donors.length`, a real `fulfilledRequests / requests.length` percentage, `donors.filter(role === 'hospital' && isVerified).length`, `donors.reduce(... livesSaved)`), and removed the "API Infrastructure Status" panel entirely (the Django/FCM/Redis claims had no basis anywhere in this stack). Left the "Blood Group Demand Index" chart's hardcoded percentages alone — that one wasn't part of this finding (it's a plausible placeholder for a real feature, not a claim about infrastructure that doesn't exist) and fixing it would need request-derived aggregation, a larger change than this pass scoped in.

---

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

---

## Update 2026-09-06 — Current lifecycle review

### Confirmed findings

- **High — stale donation-loop results after logout:** `src/App.tsx`, `refreshLoopData` clears donor-specific state without invalidating an already-running request. A response that started before logout can repopulate the cleared arrays.
- **High — stale notifications after donor change:** the notification effect guards its fetch with `cancelled`, but the donor-present cleanup currently returns only the realtime unsubscribe function and never flips that flag.
- **High — auth-view refresh coalescing:** `refreshSharedData` returns any existing in-flight promise without checking whether its `loggedIn`/points key matches the new caller. A guest refresh can satisfy an authenticated refresh, or the reverse.
- **Medium — modal callback churn:** `useDismissable` depends on `onClose`, while modal callers pass inline callbacks. Parent rerenders can repeatedly create history entries and listener registrations while the overlay remains open.
- **Medium — hospital responder requests:** `HospitalPortal` launches async responder fetches without cancellation/version guards.
- **Low — signup timeout retention:** the profile insert timeout in `signUpDonor` is not cleared when the request wins the race.
- **Low — auth lookup after unsubscribe:** an already-started donor lookup from `subscribeToAuthState` cannot be cancelled, although `App` prevents its result from committing after unmount.

### Existing protections verified

Realtime channels have one cleanup path, the live refresh timer is cleared on effect cleanup, and shared refreshes are already coalesced for matching requests. No `setInterval` or render-time channel creation was found. These are not findings.

### Fix order

1. Invalidate donor-specific and auth-scoped stale results.
2. Stabilize modal listener/history ownership and hospital responder loading.
3. Clear short-lived signup timers and guard post-unsubscribe auth callbacks.
4. Run typecheck, production build, and delayed-response browser verification.

Runtime Network/Performance verification remains necessary to confirm request counts under rapid auth transitions and realtime bursts.

### Implementation status

This pass implemented the six actionable lifecycle fixes:

- auth-keyed shared refresh single-flight and stale-generation protection;
- donation-loop invalidation on logout;
- notification fetch cancellation on donor change/logout;
- stable dismissable-overlay listener/history ownership;
- hospital responder cancellation on request-set changes/unmount;
- signup timeout cleanup and post-unsubscribe auth callback guarding.

`npm run lint`, `npm run build`, and `git diff --check` pass. Browser-level delayed-response, auth-transition, and realtime burst verification remains open because it requires a running Supabase-backed browser session.

## Update 2026-09-06 — Public data privacy hardening

Added `patch_25_public_data_privacy.sql` and updated the client to consume its
sanitized projections. The patch removes exact donor coordinates from public
directory data, anonymizes patient names in the completed-donation feed, and
creates public/authenticated request projections without phone, WhatsApp,
clinical notes, or patient identity. Anonymous access to the `donors` and
`requests` base tables is revoked; authenticated base-table request reads are
limited to the request owner or admin. The frontend uses approximate district/
area coordinates and the authenticated offer workflow instead of public request
contact links. New requests persist `needed_by_at` as a real timestamp while
retaining legacy text for migration compatibility.

Static validation passed: `npm run lint`, `npm run build`, `git diff --check`,
and workspace diagnostics. The SQL migration itself still requires execution in
Supabase SQL Editor and post-migration anon/authenticated behavior checks.

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
