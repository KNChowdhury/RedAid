# LifelineBD Codebase Review

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
