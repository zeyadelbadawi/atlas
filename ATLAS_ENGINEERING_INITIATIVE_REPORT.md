# Atlas Engineering Initiative Report — Local-First, Customer Requests, Account-Takeover Hardening

| | |
|---|---|
| Period | 8–9 October 2026 |
| Repositories | `zeyadelbadawi/atlas` (frontend), `zeyadelbadawi/atlas-backend` (backend) |
| Pull requests | [atlas#33](https://github.com/zeyadelbadawi/atlas/pull/33) (merged as `a59be1f`), [atlas-backend#41](https://github.com/zeyadelbadawi/atlas-backend/pull/41) (merged as `88b1fb4`) |
| Production | `https://atlass.dpdns.org` — backend Deploy #265, frontend Deploy #151 (both 9 Oct 2026) |
| Status of this document | Engineering record. Items that were not verified are marked **Not verified**. |
| Follow-up | [ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md](./ATLAS_SECURITY_HARDENING_LOCAL_FIRST_REPORT.md) covers the production security hardening (the deferred ATO items below), secure local-first Academy websites, phone number, Arabic RTL and the forensic video watermark. It also has the section "Deferred: VPS Disk Capacity and Docker Image Retention". |

## Contents

1. [Executive Summary](#1-executive-summary)
2. [Initiative Scope](#2-initiative-scope)
3. [Local-First / Offline Architecture](#3-local-first--offline-architecture)
4. [Customer Request System](#4-customer-request-system)
5. [Account Takeover Security Investigation](#5-account-takeover-security-investigation)
6. [Notification Context Isolation](#6-notification-context-isolation)
7. [Stale Tab / Session Recovery](#7-stale-tab--session-recovery)
8. [Dashboard Profile / Header UX](#8-dashboard-profile--header-ux)
9. [Plan Feature Cleanup](#9-plan-feature-cleanup)
10. [Device Identity & Device Limit](#10-device-identity--device-limit)
11. [Database / Migration Changes](#11-database--migration-changes)
12. [API / Backend Changes](#12-api--backend-changes)
13. [Frontend Changes](#13-frontend-changes)
14. [Security Model](#14-security-model)
15. [Performance & Scalability](#15-performance--scalability)
16. [Testing & QA](#16-testing--qa)
17. [Production Deployment](#17-production-deployment)
18. [Production Verification](#18-production-verification)
19. [Problems Discovered During Implementation](#19-problems-discovered-during-implementation)
20. [Architectural Decisions](#20-architectural-decisions)
21. [Future Recommendations](#21-future-recommendations)
22. [Final Status](#22-final-status)

---

## 1. Executive Summary

**What this initiative was.** Three planned workstreams plus six tasks added during the work:

- **W1 Local-first dashboard.** The management dashboard keeps working without a connection: saved reads, an offline session, a durable outbox for safe changes, and an app shell.
- **W2 Customer Requests ("Request a Feature").** Academy owners and administrators can ask the Atlas team for a logo, domain, theme, custom section or custom feature. Platform Owners triage requests in a console and route each type to a team inbox.
- **W3 Account-takeover (ATO) hardening.** A full review of the account lifecycle, with every confirmed finding fixed at the server.
- **Added tasks:**
  - notification context isolation (Management and each academy see only their own notifications);
  - stale-tab and expired-session recovery;
  - dashboard header (a "Welcome, {name}" account menu, appearance inside it, a clearer language switcher);
  - plan feature cleanup (stop advertising features Atlas does not enforce);
  - device identity and device-limit termination;
  - Requests sidebar entry for academy Administrators.

**Major architectural decisions**

- **Offline is read-mostly.**
  - Reads come from an explicit allowlist, saved per user in IndexedDB.
  - Only replay-safe writes are queued: marking notifications read.
  - Everything that creates, pays, publishes or deletes stays online-only. CRDTs were not needed.
- **The server stays authoritative.** Offline state never grants an action. The session ends only on a definitive 401/403, never on a network error.
- **Notification context lives in the database, not the client.** Each notification row now carries `context` and `academy_id`. The server derives the scope from the session's own record and the request host; no client parameter selects it.
- **Device identity is always issued.** The browser always holds a device identity, including at the device cap. Removing a device goes through one shared path, which also denylists the removed sessions' access tokens immediately.
- **Team routing uses the existing outbox.** Customer-request routing emails go through the existing communications outbox, with a new address recipient that never carries tenant IDs.

**Security improvements**

- **F1 (High):** pre-account takeover through unverified accounts that inherited later grants. Closed.
- **Further fixes:**
  - the Google `setup` intent could drop an active account's password;
  - 2FA enrolment needed no re-authentication;
  - credential links could be built on tenant-controlled custom domains;
  - the rate limiter could leave a key without a TTL (a permanent block);
  - registration timing revealed which addresses have accounts;
  - reset-token retention;
  - TOTP replay race;
  - JWT algorithm pinning;
  - `X-Forwarded-Host` pinning at the edge.
- **Session handling:** a multi-tab refresh race no longer signs every tab out.
- **Device removal:** now revokes the removed device's access tokens immediately.

**Major UX improvements**

- Offline banner with sync states.
- Contextual request cards next to the related features.
- "Try again" that actually recovers after a deploy.
- Account menu greeting the person by name.
- A plan comparison that shows only real limits.
- The device-limit dialog terminates a device on the first click.

**Final production status**

- **Both PRs are merged and deployed.** All four migrations were applied in production on 9 October 2026 at 08:12 UTC, after an automatic pre-migration backup.
- **API-level checks pass**, as do checks of the deployed build's contents (§18).
- **Signed-in browser checks in production are Not verified.** The sandbox's browser cannot reach production, so they are pending the owner's manual checklist (§18).

---

## 2. Initiative Scope

| # | Task | Type | Purpose | Status |
|---|---|---|---|---|
| I0 | Investigation: frontend data layer, backend sync/tenancy, requests infrastructure, ATO audit | Investigation | Establish facts before design (four read-only investigations) | Complete |
| W1 | Local-first dashboard | Infrastructure / architecture + UX | Dashboard usable offline without weakening security | Complete; deployed |
| W2 | Customer Requests | Implementation + UX | Productised custom-service requests with routing and audit | Complete; deployed |
| W3 | ATO hardening | Security hardening | Verify and fix account-takeover weaknesses | Complete (confirmed findings fixed; some deferred, §5) |
| N | Notification context isolation | Security / correctness | Management vs Academy A vs Academy B feeds | Complete; deployed |
| S | Stale-tab / expired-session recovery | Correctness / infrastructure | "Try again" works after a deploy or token expiry | Complete; deployed |
| P | Dashboard header | UX | Welcome trigger, appearance in menu, language switcher | Complete; deployed |
| PL | Plan feature cleanup | Product correctness | Stop advertising unenforced plan features | Complete; deployed |
| DV | Device identity + device-limit termination | Correctness / security | Same browser = same device; popup terminate works | Complete; deployed |
| NAV | Requests entry for academy Administrators | UX / authorization consistency | Sidebar follows the same role rule as the API | Complete; deployed |
| TD | Import-cycle debt record | Documentation | Record two new import cycles as technical debt | Complete (`docs/TECHNICAL_DEBT.md`, TD-1) |
| OPS | Production disk exhaustion during deploy | Operations (unplanned) | Unblock the backend deploy | Resolved manually; prevention recommended (§21) |
| R | This report | Documentation | Authoritative record | This document |

---

## 3. Local-First / Offline Architecture

### 3.1 Problem

Before this work the dashboard had no offline capability at all:

- **No IndexedDB, no service worker, no web app manifest** (frontend investigation).
- **An offline reload signed the person out.** `session.service.ts` restore performed refresh + `/users/me` and called `tokenService.clear()` on *any* failure, including a network error.
- **Network errors produced global error toasts.**
- **A sign-out made offline left the server session live.** `authenticationService.signOut` swallowed the failure, so nothing recorded it or retried it.
- **Query keys were not scoped by user.** They were mostly scoped by academy (`query-keys.ts`), and the query cache was not cleared at sign-out.

The goal was to let owners and staff keep navigating and reading their dashboard during connectivity loss without any security regression.

### 3.2 Investigation — alternatives

**Recorded facts** (from the frontend and backend investigations):

- **Cache and limits:** TanStack Query v5 with `staleTime` 60 s, `gcTime` 5 min and `refetchOnReconnect`. The CSP already allowed `worker-src 'self'`. HTML was `no-cache` and assets `immutable`.
- **Concurrency checks:** no `If-Match`/ETag. Page saves use a required `expectedVersion` and return 409 `stale_resource_version`.
- **No idempotency or deltas:** no generic `Idempotency-Key`, no realtime channel, offset pagination only, no delta endpoints.
- **Strict validation:** the backend `ValidationPipe` uses `forbidNonWhitelisted`, so unknown body fields return 400 (relevant to client mutation IDs).

| Option | Considered for | Outcome | Recorded rationale |
|---|---|---|---|
| **IndexedDB** (own ~200-line wrapper) | Saved reads, outbox, metadata | **Accepted** | Header of `offline-store.ts`: three small keyed stores, no cross-store queries or migrations; a small wrapper with one rule (fail closed, never throw into the app) is easier to audit than a dependency and leaves the bundle unchanged. |
| Dexie / idb libraries | Same | **Rejected** | Same comment: a dependency was not justified for three keyed stores. |
| **Cache Storage + Service Worker** | App shell only | **Accepted, narrowly** | `public/sw.js`: caches only the build's `index.html` and hashed `/assets/*`. Never `/api/*`, never cross-origin, never non-GET. People's data is cached by the app, per user, not by the worker. |
| **TanStack Query `dehydrate`/`hydrate`** | Persisting query results | **Accepted** (used directly) | `query-persistence.ts`: per-query records keyed by user ID, with an allowlist, TTL, size bounds and a build buster. |
| `@tanstack/query-persist-client` | Same | Not adopted | No separate written comparison was recorded. The implementation needed per-record user scoping, a default-deny allowlist and per-entry size limits, and does this directly with `dehydrate`/`hydrate`. |
| Background Sync API | Replaying queued changes | Not adopted | No separate written comparison was recorded. The outbox drains from an open page under a Web Lock, with jittered reconnect and backoff (§3.3.4). |
| Workbox / vite-plugin-pwa | Service worker generation | Not adopted | No separate written comparison was recorded. The hand-written worker is about 185 lines with a single, auditable policy. |
| CRDTs / merge | Conflict resolution | **Rejected** | The only queued writes are idempotent and order-independent (marking notifications read). Editors stay online-only and keep the existing server version check (409), so no merge is needed. |
| Encrypting the local store | Offline data at rest | **Rejected** | `query-persistence.ts`: a key the page can use would sit next to the data on the same device. The protections that work are storing nothing sensitive, per-user records, wiping at sign-out, and expiry. |

### 3.3 Final architecture

#### 3.3.1 Storage architecture and IndexedDB schema

| Item | Value |
|---|---|
| Database name | `atlas-offline` |
| Version | `1` |
| Stores | `queries` (saved query results), `outbox` (queued changes), `meta` (identity snapshot and similar) |
| `queries` record key | `${userId}\|${queryHash}`; the record holds `userId`, `queryKey`, the dehydrated state, `bytes` and `buster` |
| `outbox` entry | `id, userId, kind, payload, createdAt, attempts, nextAttemptAt, status (pending\|failed\|conflict), lastErrorKey?` |
| Failure handling | Every operation resolves to "nothing stored" instead of rejecting. `status()` reports `available`/`unavailable`/`full`, and a quota error marks the store `full`. |

#### 3.3.2 What is cached (default deny)

**Allowlist** (`isPersistableQueryKey`):

- `academy` (only the `list`, `detail`, `stats` and `membership` kinds);
- `course`, `dashboard`, `notification` and `organizations`;
- `website`, except `contactSubmissions` and `contactSubmissionSummary`.

**Never written to disk:**

- rosters and member lists;
- orders, payments and billing;
- audit logs;
- support and customer requests;
- analytics;
- anything about authentication.

#### 3.3.3 Limits and expiry

| Limit | Value |
|---|---|
| TTL | 24 h (older copies are deleted, not shown) |
| Max records | 400 |
| Max single record | 512 KiB |
| Max total | 8 MiB per browser (least recently saved evicted first) |
| Write debounce | 1 s |
| Build buster | `atlas-offline-v1` (a new build discards all saved copies) |
| Identity snapshot TTL | 7 days |

**Freshness.** A restored copy is always marked stale (fix `50d9b38`):

- online, it is refetched as soon as it is used;
- offline, it is still shown;
- fresher data already in the cache is never overwritten.

#### 3.3.4 Sync architecture, mutation queue, retry, idempotency

**Only replay-safe changes are queued:**

- `notification.read`: the same PATCH twice gives the same state.
- `notification.read-all`: bounded by `before`, the moment the person pressed it (backend `96e11c3` added the optional `{ before }` body). Notifications that arrive later are never marked read.

Everything else uses `networkMode: 'always'` and fails immediately with an offline message. It is never silently replayed.

**Durable.** The outbox lives in IndexedDB, survives reloads and browser restarts, and belongs to the user who queued it. Sign-out clears it.

**One runner.** Every tab can enqueue, but a Web Lock (`atlas:outbox`) lets only one tab drain at a time.

**Retry:**

- reconnect waits a random 0–10 s before the first attempt (`RECONNECT_JITTER_MS`);
- failures back off exponentially with full jitter (base 2 s, cap 5 min);
- a transient failure stops the drain;
- a 401 waits for a new session;
- a 409 becomes `conflict`;
- any other 4xx becomes `failed`, offering Retry / Discard (`discardUnsyncableOutbox`);
- a handler may drop on a status that means "already done" (for example a 404 for a deleted notification).

**Query refetch on reconnect** is jittered by up to 5 s (`RECONNECT_REFETCH_JITTER_MS`, `installJitteredOnlineManager`).

**Online state.** The TanStack `onlineManager` is seeded from `navigator.onLine`, so queries do not fire offline after a reload.

#### 3.3.5 Conflict resolution

| Resource | Strategy |
|---|---|
| Notification read state | Idempotent; no conflict possible |
| Website pages and editors | Online-only; the existing server version check (`expectedVersion` → 409 `stale_resource_version`) is unchanged |
| Anything else | Online-only (not queued) |

#### 3.3.6 Authentication, authorization, isolation

**Offline reload.** The session resumes read-only from an identity snapshot in the `meta` store, and only a definitive 401/403 ends it. A network error never signs the person out.

**The server stays authoritative.** Every queued change is re-authorised when it is sent. A 401 pauses the outbox, and other refusals surface to the person.

**Offline sign-out:**

- the tab signs out at once;
- saved copies are wiped;
- `atlas:pending-sign-out` is recorded in `localStorage`;
- on the next online start the server session is revoked *first*, and nothing is restored.

`authenticationService.signOut` now propagates errors so the pending state can be recorded.

**Tenant, academy and account isolation:**

- records are keyed by user ID and restored only for the same user;
- query keys already carry the academy ID, and each academy route renders only its own keys;
- sign-out, a server-ended session, or a different person signing in wipes the whole store.

**Host scope.** Persistence, restore and the outbox run only on the platform (dashboard) host, gated by `isPlatformHost()`. An Academy website and its learner portal always read from the network. The service worker is registered only on the platform host, in production builds.

**Kill switch.** A build with `VITE_OFFLINE_SHELL=off` unregisters the worker and deletes its caches.

#### 3.3.7 Service worker behaviour

- **Navigations are network-first.** The saved shell is refreshed in the background at most once a minute and served only when the network fails.
- **The shell comes from a fresh `/index.html` fetch.** It is never a navigation response, which could be a prerendered blog page, and it is stored as a new non-redirected `Response`.
- **`/assets/*` is cache-first.** Lookups use `ignoreVary` (module scripts send `Origin`), and only real non-HTML responses are stored, at most 400 files.
- **Lazily loaded route chunks are cached too.** The page posts the asset URLs it already loaded (`atlas:cache-assets`).

### 3.4 Scalability

- **Reconnect storms:** a 0–10 s jitter before the first outbox attempt and up to 5 s jitter on query refetches spread a region coming back online.
- **Retry storms:** full-jitter exponential backoff capped at 5 min, and one drainer per browser (Web Lock). A transient failure stops the drain instead of hammering through it.
- **API load:** saved reads serve offline navigation without requests. Online, restored copies are marked stale and refetched only when used, which is the same request volume as before. **Not verified:** no load test was run.
- **Batching, incremental sync, deltas:** not implemented. The outbox carries only small idempotent notification calls. The backend has no delta endpoints (offset pagination only); this is noted as a future recommendation (§21).
- **Storage:** at most 8 MiB and 400 records per browser, with a 24 h TTL.

### 3.5 UX states

`ConnectivityBanner` (`data-connectivity` attribute):

| State | Behaviour |
|---|---|
| Online | No banner |
| Offline | Offline banner; saved copies shown; online-only actions show an offline toast |
| Reconnecting / Syncing | Banner shows syncing while the outbox drains |
| Synced | A "synced" notice when `lastSyncedAt` advances (not after a Discard) |
| Failed / Conflict ("attention") | Banner offers Retry and Discard |

The notification bell shows a "not saved" state while a mark-read is paused offline.

### 3.6 Testing (actually executed)

- **Unit tests** (all part of the final full Vitest run, §16):
  - `offline-layer.test.ts`, including the stale-restore regression test, which fails without `50d9b38`;
  - `app-shell.test.ts`;
  - `session-offline.test.ts`;
  - `sign-out-delivery.test.ts`;
  - `notification-outbox.test.ts`;
  - `connectivity-banner.test.tsx`.
- **J45 Playwright (Chromium, real API, production build served by `vite preview` on :3002).** Scenarios:
  1. Online once: the shell worker installs, and only allowlisted reads are saved, only for this user.
  2. Offline, then reload: the dashboard opens with the offline banner and the same badge count.
  3. Mark one notification read offline: the badge drops at once, the outbox holds exactly one entry, and the server is still unread. Back online, only that notification becomes read.
  4. Sign out offline: saved copies are wiped, the pending-sign-out marker is set, and the server session is still live. Back online, the session is revoked first.
  5. Another person on the same browser sees only their own saved records.
  6. Without IndexedDB, the dashboard works online with no page errors.
- **Results:**
  - J45: 2/2 passed during development, and **2/2 passed again on 9 Oct 2026 against the merged `main` code** (production build, local stack).
- **Not verified:**
  - offline behaviour on production (`https://atlass.dpdns.org`) in a real browser (pending the owner checklist);
  - Academy A → offline → Academy B switching in a browser, which is covered by key scoping and unit tests rather than a dedicated browser journey;
  - multi-tab outbox draining in a browser.

---

## 4. Customer Request System

### 4.1 Request types and contextual fields

Every contextual field is optional free text (or yes/no), bounded and validated on the server. Unknown keys are refused with 400.

| Type | Contextual fields |
|---|---|
| `logo` | `brandName`, `style`, `colors`, `references` |
| `domain` | `desiredDomain`, `alreadyOwned` (boolean), `registrar` |
| `theme` | `style`, `colors`, `references`, `requirements` |
| `custom_section` | `page`, `references` |
| `custom_feature` | `problem`, `expectedOutcome` |

**Common fields:**

- title (3–160 characters);
- description (10–5000 characters);
- priority (`low` / `normal` / `high`);
- a client request ID, which makes submission idempotent per requester.

### 4.2 Where the actions appear (UX)

**Contextual cards next to each feature:**

- Visual Identity (logo);
- the Domain tab;
- the Theme tab;
- the website builder's section menu (custom section);
- the academy dashboard (custom feature).

**Requests page:** a list with status and type filters and search kept in the URL, plus a detail view with history and replies and a Cancel action. Pages are lazy-loaded.

**Who sees the cards and the Requests entry:** the academy's owner and administrators only. The Requests sidebar entry uses the verified academy role from `GET /academies/:id/me` (task NAV, `470a3d9`), the same rule the API applies. No new permission was introduced.

### 4.3 Final lifecycle

`submitted → received → under_review → in_progress → waiting_for_customer → completed`, plus `rejected` (team) and `cancelled` (customer).

Team transitions, from `TEAM_TRANSITIONS`:

| From | Allowed to |
|---|---|
| submitted | received, under_review, in_progress, waiting_for_customer, rejected |
| received | under_review, in_progress, waiting_for_customer, completed, rejected |
| under_review | in_progress, waiting_for_customer, completed, rejected |
| in_progress | under_review, waiting_for_customer, completed, rejected |
| waiting_for_customer | under_review, in_progress, completed, rejected |
| completed | in_progress (reopen) |
| rejected, cancelled | — (final) |

**Other rules:**

- A customer reply while the request is `waiting_for_customer` returns it to `in_progress`.
- Closed requests accept no messages.
- Every transition takes a row lock.

### 4.4 Data model

**`customer_requests`:**

- ownership: organization, academy, requester (FK, `ON DELETE SET NULL`) and assignee (FK, `SET NULL`);
- content: type, status, priority, title, description, `details` (a JSONB object, enforced by CHECK);
- `client_request_id`, unique per requester;
- `last_activity_at` and `closed_at`, plus the usual timestamps;
- indexes on (academy, last_activity), (status, last_activity), (type, last_activity) and (organization).

**`customer_request_events`:**

- the history and conversation of a request;
- `kind`: created, status_changed, assigned, customer_message, team_message or internal_note;
- `visibility`: customer or internal;
- `actor_side`: customer or team;
- body of at most 5000 characters;
- internal kinds are enforced by a CHECK.

**`customer_request_routing_rules`:** one rule per type mapping to a responsible email (validated by CHECK). Platform Owners only.

**Audit:** `customer_request.*` actions in the audit log for every meaningful event. Team-only events are hidden from tenants.

### 4.5 Permissions

| Actor | Access | Enforced by |
|---|---|---|
| Academy owner / administrator | Create, list, view, reply to and cancel their academy's requests | `JwtAuthGuard + ManagementSurfaceGuard + AcademyScopeGuard + @AcademyRoles('owner','administrator')`; RLS (a tenant inserts only its own untriaged request, and reads only `customer`-visibility events) |
| Academy manager, instructor, other roles | None (no card, no entry, API refuses) | Guards; J46 asserts that a Manager gets no card and no entry |
| Platform Owner | All requests, transitions, assignment, internal notes, replies, routing | `JwtAuthGuard + ManagementSurfaceGuard + PlatformOwnerGuard`; RLS platform policies |

**Internal notes and assignment are hidden by the database (RLS),** not only by the API mapper. J46 checks that the owner's page *and* API responses never contain the internal note.

### 4.6 Email routing

- **The team inbox per request type is configurable** on the Platform Owner routing page (`PUT platform/customer-request-routing`). Nothing is hardcoded.
- **Delivery uses the existing communications outbox,** with a new address recipient:
  - `emitToAddress` writes `communication_outbox.recipient_email`;
  - a partial unique index on `(recipient_email, dedupe_key)` makes retries never send duplicates;
  - address rows never carry organization or academy IDs, so a tenant cannot read the team address.
- **With no inbox configured, every Platform Owner is emailed.**
- **Communication keys:**
  - `customer_request.routed` (team address; no in-app notification);
  - `customer_request.received` and `customer_request.customer_replied` (Platform Owner feed);
  - `customer_request.submitted`, `customer_request.status_changed` and `customer_request.team_replied` (to the requester).
- **Links:** the requester's links open `/dashboard/academy/:academyId/requests/:id` (`fd56c7c`); Platform Owner links open `/dashboard/platform/customer-requests/:id`.

### 4.7 Platform Owner management

The console provides:

- filters for type, status and academy, plus search, assignee and counts;
- status moves limited to the allowed transitions, with an optional message to the customer;
- replies and internal notes;
- full history;
- an email-routing page per request type.

---

## 5. Account Takeover Security Investigation

### 5.1 Method

- **A read-only review of the whole account lifecycle** by a dedicated investigation (sections A–L below). Every finding cited `file:line`, and findings were classed CONFIRMED or POSSIBLE.
- **Each finding was re-verified in code before fixing.** One suggested fix was rejected; see F2.
- **Fixes were made at the server,** with negative-control regression tests where practical.

### 5.2 Areas investigated, where no vulnerability was found

| Area | What was checked |
|---|---|
| Login | Argon2id (m=19456 KiB, t=2, p=1); dummy-hash equalisation for unknown accounts and accounts without a password; one generic 401; `suspended` revealed only after the password is proven; client IP from `X-Real-IP` only behind a private peer |
| Sessions / refresh tokens | 900 s JWT carrying only `sub` and `sid`; opaque 256-bit refresh token stored as SHA-256 and rotated atomically; reuse after a 60 s grace revokes the whole family; `__Host-atlas_session` cookie (HttpOnly, Secure, SameSite=Strict); refresh and sign-out require a same-origin `Origin`; surface and academy resolved from the database on every request |
| Logout | Server revocation plus denylist |
| Password reset (base) | 32-byte token stored hashed; 45 min TTL; single use via a conditional claim; other outstanding tokens spent; identical response either way; link host from configuration, never from headers |
| Email verification | Hashed, single-use tokens, rotated under a lock; generic refusals |
| Email change | **No email-change feature exists** (profile accepts name and avatar only), so it does not apply |
| Role and membership changes | Organization role and permissions are read from the database on every request, so a revocation takes effect immediately |
| Authorization | Path academy and organization IDs are re-verified; platform routes are triple-guarded; no user-ID routes, no admin set-password, no impersonation |
| Redirects | Backend `sanitizeReturnPath`; frontend `isSafeReturnPath` used only through router navigation. No open redirect was found. |
| OAuth (Google, behind a flag that defaults to off) | state, nonce, PKCE S256, binder cookie, origin pinning, full ID-token validation; an email match never auto-links |
| CORS / CSRF / headers | Allowlisted CORS; Helmet; CSP `script-src 'self'`; SameSite=Strict plus the Origin check |

### 5.3 Findings

| ID | Issue | Severity | Root cause | Fix | Regression test |
|---|---|---|---|---|---|
| **F1** | Pre-account takeover: an unverified account inherits roles granted later | **High** (CONFIRMED; impact depends on the OTP flag) | Sign-in did not require a verified email, and member-add reused any active account by email. An attacker who registered the victim's address first would receive the victim's later staff grants. | A grant by someone else returns a never-verified account to `invited` first: password, linked sign-ins, 2FA, sessions and trusted browsers are withdrawn, and the setup link goes to the mailbox (`UnprovenAccountService.requireMailboxProofBeforeGrant`). A password reset, as the first mailbox proof, removes the 2FA and external sign-ins an unproven account carried. A *proven* account keeps its 2FA. | `ato-hardening.e2e-spec.ts` (9 tests; F1-01/02 fail without the fix) |
| **F2** | The Google `setup` intent accepted a reset token for an *active* account and dropped its password without revoking sessions | Medium (CONFIRMED; needs Google enabled) | The setup intent was not restricted to invited accounts | `setup` is for invited accounts only, and activation never removes an active account's password. **Rejected alternative:** removing TOTP on every password reset. That would let a mailbox compromise bypass 2FA, so it applies only to never-verified accounts. | `ato-hardening`, GID-INV-03 |
| **F3** | TOTP enrolment needed only a session, sent no notice, and disabling it did not revoke sessions | Medium | No step-up | Confirming enrolment requires the password (credential rate limit); `auth.two_factor.enabled`/`disabled` security notices (EN/AR); disabling ends every other session. The frontend setup dialog asks for the password (`4a66085`). | `ato-hardening`, `phase10-3-two-factor` |
| **F4** | Academy reset/setup/verification links were built on the academy's canonical host, which may be a tenant-controlled custom domain | Medium-High (POSSIBLE) | Link builder preferred the custom domain | Links that carry a credential are built on the academy's Atlas subdomain (or the platform URL), keeping the branding (`efcfa2d`) | Password-reset-surface suites |
| **F6** | Timing oracle on academy registration (two Argon2 calls vs one) | Low-Medium | Unequal work | A new address performs the same dummy verification | — (no timing test) |
| **F8** | Rate limiter INCR/EXPIRE not atomic, so a key could be left without a TTL (permanent block) | Low | Two commands | One Lua script; TTL-less keys are repaired on the next hit | Auth rate-limit suites |
| **F12** | Reset token lingers in the URL; failed reset-email jobs kept the raw token forever | Low | — | The token is removed from the address bar (`history.replaceState`, `4442910`); failed jobs are removed after 24 h | — |
| **F14** | JWT algorithms not pinned; TOTP `lastTimeStep` race; client `X-Forwarded-Host` | Info | — | HS256 only; the TOTP step is claimed conditionally (one code cannot mint two sessions); Caddy sets `X-Forwarded-Host` itself (`4442910`) | `ato-hardening` |

### 5.4 Remaining risks (not fixed in this initiative)

| ID | Item | Why deferred |
|---|---|---|
| F5 | Member lookup returns the display name for an email (account-existence oracle for tenant owners) | Asserted by design in `smart-member-invite` tests; changing it is a product decision |
| F7 | Per-email sign-in budget (10 per 900 s) allows targeted sign-in denial of service | Trade-off against brute-force protection |
| F9 | Password-reset request timing difference | Low; POSSIBLE |
| F10 | Sliding refresh has no absolute session cap | Product decision on session length |
| F11 | MFA is not mandatory for Platform Owners or organization owners | Hardening; recommended (§21) |
| F13 | Email-provider click tracking might rewrite credential links | **Requires follow-up verification** of provider settings |
| — | Unsubscribe HMAC derived from the JWT secret | Key separation recommended |
| — | Production values of the email-OTP flags | **Not verified.** Recommended value: `new_device` on both surfaces, which closes the F1 window independently. |

---

## 6. Notification Context Isolation

### 6.1 Original behaviour and root cause

**What happened:**

- One identity can be a Management user and a learner at several academies.
- `notifications` had no notion of where a notification belonged, and every read was `WHERE user_id = me`.
- So the Management dashboard and every academy's learner area showed one mixed feed and one unread count, and "mark all read" cleared all of them.

**Why:** the writer already knew the context (the catalogue audience and the event's academy) but dropped it.

### 6.2 Model

**New columns:** `notifications.context` (`management | academy | account | unscoped`) and `notifications.academy_id`.

**Integrity:** a CHECK requires that `academy` rows, and only `academy` rows, name an academy. A new index on `(user_id, context, academy_id, is_read, created_at DESC)` serves the scoped feed.

**Creation:** `CommunicationService.emit` places every row from the catalogue audience:

| Audience / event | Context |
|---|---|
| Staff or platform | `management` |
| Learner | `academy`, for that academy |
| The account's own security notices (password, linked identities) | `account`, shown in every context |
| Campaigns | By their audience |
| A learner event with no academy | `unscoped`: stored, shown nowhere, and logged (never guessed) |

The quiz auto-submit notice now resolves its academy from the course.

**Reads and writes:**

- `NotificationScopeService` derives the scope from the session's own server-side record and the request host. An academy session is honoured only on its own academy's host.
- List, unread summary, mark-as-read and mark-all-read all filter by that scope in the query. Mark-as-read returns 404 outside the context.
- **No client parameter selects a context.**

**Frontend (`2920b03`):**

- `notificationKeys.list` / `unreadCount` are keyed by scope (`'management'` or `'academy:<id>'`).
- The learner tree provides its academy's scope; the dashboard defaults to Management.
- Mark-read and mark-all-read refresh only their own context.

**Delivery:** unchanged. There is no realtime channel; the summary is polled every 60 s.

### 6.3 Migration

`20261106100000_notification_context` backfills existing rows only where the context is certain:

- title keys that derive 1:1 from the catalogue;
- the outbox row or campaign that recorded the academy.

The rest stay `unscoped` and age out under existing retention. **Nothing is deleted.**

### 6.4 Guarantee

```
Management  → Management notifications (+ account notices) only
Academy A   → Academy A notifications (+ account notices) only
Academy B   → Academy B notifications (+ account notices) only
```

Enforced on the server, in the query. **Tests:**

- `notification-context-isolation.e2e-spec.ts`: 9 tests including the backfill; 5 fail with scoping disabled.
- `notification-context.spec.ts`: 85 unit tests.
- Communications and notifications e2e: 20 suites, 335 tests pass.
- Frontend learner and notification Vitest suites: 169.

**Production browser check:** Not verified (pending the owner checklist, §18).

---

## 7. Stale Tab / Session Recovery

### 7.1 Reproduction and root cause

The root cause was proven against production before the fix:

1. Every deploy replaced the Caddy image, which contains only the current build's `dist`, so the previous build's hashed chunks disappeared.
2. Caddy answered a missing `/assets/*.js` with the SPA `index.html` (200 `text/html`). The browser's module MIME check rejected it, and `import()` failed.
3. `React.lazy` caches a rejected import, so the section boundary's "Try again" re-rendered the same cached error. Only a manual reload, which loads the new build's index, fixed it.
4. With 2–6 frontend deploys a day, this hit any tab left open across a deploy.

**Secondary auth gaps found in the same investigation:**

- a refused refresh cleared the token but left the identity provider "authenticated";
- the proactive refresh never ran (`requiresRefresh` was computed once);
- `performRefresh` called `/users/me` while holding the cross-tab lock (a potential circular wait);
- the backend cleared the session cookie even when a refresh only lost a multi-tab race within the reuse grace.

### 7.2 Token lifecycles

- **Access token:** a JWT with a 900 s TTL, held in memory only.
- **Refresh token:** opaque, 30 days, in an HttpOnly `__Host-` cookie. It rotates on every refresh, and reuse after a 60 s grace revokes the whole family.

### 7.3 Final architecture

**Assets**

- Deploys carry previous builds' assets forward for 14 days.
- A chunk that is truly gone returns an uncached 404 (Caddy `app_assets`).
- Verified in production: §18.

**Chunk loading**

- `lazyWithRetry` / `importWithRetry` retry a chunk load, then reload once.
- A `sessionStorage` guard prevents loops, and nothing reloads while offline.
- `vite:preloadError` is handled the same way.

**ErrorBoundary**

- "Try again" resets the query error boundary and remounts its subtree.
- A chunk error offers a reload; offline, it waits for the network; repeated failures say so.
- The dashboard outlet's boundary resets on navigation.

**Session lifecycle**

- Only a 401/403 ends a session.
- A refused refresh clears local state in every tab (BroadcastChannel).
- Signing in as another user in another tab restarts this one.
- Proactive refresh runs before expiry and on wake, focus and online events.
- The refresh holds the cross-tab lock only for the rotation itself.

**Backend (`bc50ecb`):**

- A refresh that lost a race inside the grace window throws `SupersededRefreshTokenException`: the same generic 401, but the cookie is left alone.
- Replay after the grace still ends the family and clears the cookie (SC-07).

```
idle ─(request)→ 401 ─→ refresh (single-flight + Web Lock)
   ├─ ok → retry once → success
   ├─ superseded (multi-tab race) → keep cookie; another tab's rotation wins
   └─ refused (401/403) → broadcast session-ended → every tab signs out
network error → keep session; wait for online → proactive refresh
```

### 7.4 Testing

- **Frontend:** full Vitest at that point, 281 files / 3526 tests, passing; tsc and ESLint clean.
- **Backend:**
  - SC-07 in `session-cookie.e2e-spec.ts` fails with the fix disabled;
  - 21/21 across `session-cookie`, `auth-refresh`, `auth-refresh-concurrency` and `auth-audit-hardening`;
  - identity unit tests: 137.
- **Caddyfile:** adapted successfully with the stock Caddy 2.8.4 binary (with the `dns cloudflare` line swapped, because that plugin is not in the stock build). Real-server probe: an existing asset returned 200 `immutable`, a missing asset 404 `no-store`, and a route returned the SPA shell.
- **Not verified:** a real browser tab kept open across an actual production deploy, and the 15-minute idle case on production (pending the owner checklist).

---

## 8. Dashboard Profile / Header UX

Commits `f1666d2`, `282db8d` and `42c4fc6`.

- **Account trigger:**
  - Before: bare initials.
  - After: "Welcome, {name}" ("مرحبًا، {name}" in Arabic); phones show the first name only.
- **Account menu:** name and email, then Profile, Appearance and Sign out.
- **Appearance (Light / Dark / System):** moved from its own header icon into the menu. It uses the existing `useTheme` preference, so there is still one source of truth, persisted as before. The duplicate header control was removed.
- **Language switcher:**
  - The trigger names the current language ("English" / "العربية"; the code on phones) beside the language mark and a chevron.
  - Options are radio items that announce their checked state.
- **Notifications** stay in the header.
- **Accessibility:** 44 px targets, Escape returns focus to the trigger, keyboard operable, RTL.
- **Tests:** `dashboard-account-menu` 13/13; localization 136/136; tsc clean.
- **Production check:** Not verified (pending the owner checklist).

---

## 9. Plan Feature Cleanup

**Audit.** Of 12 plan feature keys, only `liveSessions` is enforced (through the Live Sessions add-on, `AddOnAccessService.assertUsable`). These eleven were stored per plan and shown as plan differences, but nothing read them, so every plan could use those capabilities:

| Key | Key | Key |
|---|---|---|
| `cms` | `marketing` | `customDomain` |
| `seo` | `marketingAdvanced` | `themes` |
| `seoAdvanced` | `analytics` | `multipleThemes` |
| | `analyticsAdvanced` | `backup` |

**Where they were shown:**

- the marketing pricing page;
- the dashboard plan comparison (Plans and Usage pages);
- the Subscription page "Plan features" card;
- the Add-ons page;
- the Platform plan editor.

**Backend (`1578229`)**

- `PLAN_FEATURE_KEYS` holds only `liveSessions`.
- `pickPlanFeatures` narrows every stored value on the way out (plans, public plans, entitlements, add-on access).
- The plan editor drops a retired key silently, so an editor opened before the deploy can still save; any other unknown key is still rejected.
- Migration `20261107000000_remove_unenforced_plan_features` removes the eleven keys from stored plans and returns the `advanced-analytics` add-on (whose effect did nothing) to draft, bumping `version`. Data only, nothing deleted, idempotent.

**Frontend (`239827c`)**

- Pricing page and plan comparison: limits only.
- Subscription page: the card becomes an Add-ons card, shown only while Live Sessions is launched (the customer flag is currently off). It never claims a plan is missing something.
- Plan editor: only the Live Sessions switch.

**What remained:** every enforced limit — academies, learners, courses, instructors, staff and storage.

**Tests**

- Backend:
  - plans, platform and live-sessions unit suites: 38 suites, 593 tests;
  - p57: 19/19;
  - 15 touched e2e suites: 190 tests;
  - add-on and entitlement suites: 78 tests;
  - no Prisma migrate drift.
- Frontend: 41 files, 475 tests, in EN and AR.

**Not verified:**

- whether any production tenant had `advanced-analytics` installed;
- a production check of the EN/AR pricing and subscription pages.

---

## 10. Device Identity & Device Limit

### 10.1 Device recognition

**Previous mechanism.** A learner's device is a `student_devices` row identified by the hash of an `atlas_device` cookie (HttpOnly, SameSite=Lax, host-only, 365 days).

**Proven in Chromium, local stack:**

- A plain sign-in, sign-out, sign-in in the same browser gave 1 row and 1 notification. That path was fine.
- The defect was at the **device cap**:
  1. A browser signing in at the cap received **no** identity cookie.
  2. The lesson-grant path registered a row but had no `@Res`, so it could never send the cookie back.
  3. Every grant therefore created an unreachable orphan row with a "New device added" notification.

### 10.2 Why popup termination failed and Settings worked

- **Both use the same endpoint,** `DELETE /learning/devices/:id`.
- **The popup failed:** after a removal, its invalidation refetched the grant (call 1 registered an orphan in the freed slot), and the dialog then called `refresh()` (call 2 hit the cap again). The observed sequence was DELETE 204 → grant 200 (new row, no Set-Cookie) → grant 403 `deviceLimit`, and the dialog reappeared.
- **Settings appeared to work** because it does not re-request the grant twice.

### 10.3 Fix

**Backend (`95df63d`), `StudentDeviceService`:**

- **The browser always holds an identity,** issued at the cap too.
- **An unrecognised browser registers the identity it presents** (well-formed 64-hex values only).
- **A value already known to the registry is never reused,** whether it belongs to a removed device or to another account hidden by RLS.
- **Registration is serialised per learner and academy** (`pg_advisory_xact_lock`, re-checked under the lock), so tabs and concurrent browsers cannot exceed the cap.
- **The `created` flag alone drives "New device added".**

**Lesson grant:** writes a new identity to the response, and binds a session minted at the cap to the device it registers.

**`removeDevice`, the one path shared by the popup and Settings:**

- denylists the revoked sessions' access tokens immediately (`markRevoked`);
- drops the learning lease only when the removed device holds it.

**Frontend (`845a042`):** the dialog no longer calls `refresh()` after removal; the invalidation already re-requests the grant.

### 10.4 Data cleanup

Migration `20261108000000_revoke_unreachable_student_devices` **revokes (never deletes)** device rows that no browser can present: active, never bound to a session, and never seen after creation (`last_seen ≤ created + 5 s`).

- **Locally:** it revoked exactly the two repro orphans, and a re-run is a no-op.
- **In production:** applied 9 Oct 2026. The number of rows revoked is **Not verified**.

### 10.5 Privacy and security

- The identity is a random opaque value, stored server-side as a hash.
- No fingerprinting is used.
- Values known to the registry are never reused across accounts.

### 10.6 Tests

- **Unit:** `student-device.service.spec` 39/39 (6 new); all backend unit tests passing.
- **E2e:** `device-identity-lifecycle.e2e-spec.ts` DV-01..10 pass 10/10. With the old code, DV-05, 06, 07 and 09 fail.
- **J44 (Chromium, real stack):**
  - Scenario: browser C at the cap receives `atlas_device`; 403 → dialog lists 2 devices → DELETE 204 → exactly [403, 200] grants → dialog hidden; 2 active devices, 3 total, 3 notifications; a reload is 200 with no new row.
  - Before the fix: 403 → 200 → 403, and the dialog reappeared.
  - Passed again on 9 Oct 2026 against the merged `main` code.

---

## 11. Database / Migration Changes

All four were applied in production on 9 Oct 2026 at 08:12:39 UTC, after an automatic backup (`atlas-20261009T081139Z.sql.gz`, uploaded to S3).

| Migration | Changes | Why |
|---|---|---|
| `20261106100000_notification_context` | New enum `notification_context`; `notifications.context` (NOT NULL, default `unscoped`) and `academy_id` (FK, cascade); CHECK `notifications_context_academy_check`; index `(user_id, context, academy_id, is_read, created_at DESC)`; backfill UPDATEs (no deletes) | §6 |
| `20261107000000_remove_unenforced_plan_features` | UPDATE `plans` (remove 11 keys, bump version); UPDATE `add_ons` (`advanced-analytics` → draft) | §9 |
| `20261108000000_revoke_unreachable_student_devices` | UPDATE `student_devices` (revoke orphans) | §10 |
| `20261109000000_customer_requests` | 5 enums; tables `customer_requests`, `customer_request_events`, `customer_request_routing_rules`; `communication_outbox.recipient_email` with CHECK and partial unique `(recipient_email, dedupe_key)`; CHECKs on lengths, JSONB shape, actor side and internal kinds; 6 indexes; FORCE RLS with tenant and platform policies | §4 |

---

## 12. API / Backend Changes

| Area | Change |
|---|---|
| New: academy requests | `POST/GET academies/:id/customer-requests`, `GET …/:rid`, `POST …/:rid/messages`, `POST …/:rid/cancel` (owner/administrator; `@AllowInactiveSubscription`) |
| New: platform requests | `GET platform/customer-requests`, `GET …/counts`, `GET …/assignees`, `GET …/:rid`, `PATCH …/:rid {status?, assigneeUserId?, note?}`, `POST …/:rid/messages {body, internal?}`; `GET/PUT platform/customer-request-routing` |
| Modified: notifications | All reads and writes scoped server-side; `POST notifications/read-all` accepts optional `{ before }` |
| Modified: 2FA | Enrolment confirmation requires the password; enable/disable notices; disable revokes other sessions |
| Modified: auth | Unproven-account handling (F1); Google `setup` restricted to invited accounts; credential links on Atlas hosts; atomic limiter; HS256 pinning; superseded-refresh handling |
| Modified: devices | Identity issued at the cap; grant writes the cookie; `removeDevice` denylists access tokens |
| Modified: plans | Feature keys narrowed to `liveSessions` |
| Communications | `emitToAddress` (address recipient), new `customer_request.*` keys and templates (EN/AR), `auth.two_factor.*` notices |
| Error keys | `errors.customerRequest.{invalidDetails, closed, duplicateClientId, invalidTransition, nothingToUpdate, invalidAssignee, duplicateRoutingType}` |

Every new route is behind the existing guard stacks. "Not yours" returns 404, not 403, following the existing convention.

---

## 13. Frontend Changes

| Area | Change |
|---|---|
| New pages | Academy Requests list and detail; Platform Customer Requests list and detail; Platform request routing |
| New components | Contextual request cards and dialog; `ConnectivityBanner`; account menu |
| Offline | `src/services/offline/*`, `OfflineProvider`, `public/sw.js`, the `setUpAppShell` gate in `main.tsx` |
| Session | Offline restore, pending sign-out, BroadcastChannel session-ended, proactive refresh, the `http-client` definitive-failure rule |
| Routing / errors | `lazyWithRetry`, ErrorBoundary rewrite, outlet boundary reset on navigation |
| Navigation | `academyRoles` on navigation items, decided by the verified academy role inside an academy (`navigation.utils.ts`) |
| Notifications | Scope-keyed query keys, `NotificationScopeProvider`, offline mark-read |
| Plans | Pricing, comparison, Subscription, Add-ons and plan editor show only enforced items |
| Security UI | 2FA dialog asks for the password; reset token stripped from the URL |
| Edge | Caddy `app_assets` (missing asset → 404 `no-store`); `X-Forwarded-Host` pinned; Dockerfile and deploy carry assets forward for 14 days |
| i18n | EN/AR for every new string (`common.connectivity.*`, `customerRequests`, notifications, errors, audit labels) |
| Responsive / RTL | J46 checks the Requests list and detail at 360 px in Arabic with no sideways scroll |

**Technical debt recorded** (`docs/TECHNICAL_DEBT.md`, TD-1):

- madge reports 28 import cycles, up from 26.
- The two new ones are academy ↔ customer-requests and api ↔ identity ↔ offline.
- They are harmless today because the imports that close each loop are used only inside functions.
- The fix is planned but deliberately out of scope for this release.

---

## 14. Security Model

| Concern | Model |
|---|---|
| Authentication | Short JWT (900 s) plus a rotating refresh cookie; only a definitive 401/403 ends a session; superseded refreshes keep the cookie; unproven accounts cannot inherit grants |
| Authorization | Guards on every route (`ManagementSurfaceGuard`, `AcademyScopeGuard` + `@AcademyRoles`, `PlatformOwnerGuard`); the UI mirrors the server rule and never replaces it |
| Tenant isolation | FORCE RLS on the new tables; address-recipient outbox rows carry no tenant IDs |
| Academy isolation | Notification scope from the session record and host; request APIs scoped by the path academy, re-verified |
| Session security | Same-origin Origin check; family revocation on replay after the grace window; BroadcastChannel sign-out across tabs |
| Devices | Opaque identity, advisory-locked registration, immediate access-token denylist on removal |
| Notification isolation | §6 guarantee, enforced in the query |
| Offline data | Allowlist only; per user; 24 h TTL; wiped on sign-out, session end or a different user; platform host only; not encrypted (decision §3.2) |
| Request permissions | Owner and administrator only; internal notes hidden by RLS |
| Platform Owner permissions | `PlatformOwnerGuard` re-reads `is_platform_owner` and requires a management session |
| Sensitive data | Reset tokens stripped from the URL and dropped from failed jobs after 24 h; credential links only on Atlas-controlled hosts |

---

## 15. Performance & Scalability

- **New indexes** serve the new access paths: the scoped notification feed, and requests by academy, status, type and organization, plus the event timeline.
- **Offline reads reduce requests while offline** and do not add requests online. Restored copies are stale and refetched only when used.
- **Reconnect behaviour is jittered and backed off** (§3.4).
- **Device registration is serialised per learner and academy only.** The advisory lock is scoped, not global.
- **Email load:** one routed email per request plus requester notifications. Retries are deduplicated by a unique index.
- **Frontend bundle impact:** no runtime dependency was added (own IndexedDB wrapper, hand-written worker). The new pages are lazy-loaded. **Not verified:** bundle size deltas were not measured.
- **Not verified:** no load or performance test was run in this initiative, and no performance numbers are claimed.

---

## 16. Testing & QA

Counts are taken from runs recorded during the work. "Final" means the run on the merged code.

| Suite | Command / context | Result |
|---|---|---|
| Backend unit (final pre-merge) | `npm test` (atlas-backend) | **206 suites / 5052 tests, pass** |
| Backend CI on PR #41 | GitHub `Backend CI` (lint, typecheck, migrate + drift, unit, build, audit, DB e2e in 3 shards run twice) | **Green** |
| Backend CI on `main` `88b1fb4` | Same | **Green** |
| ATO e2e | `test/ato-hardening.e2e-spec.ts` | 9/9; F1-01/02 fail without the fix |
| Auth e2e suites | google-identity(-hardening), google-platform-signup, phase10-3-two-factor, auth-audit-hardening, auth-password-reset, smart-member-invite, launch-stabilization | 164 tests; 6 initial failures fixed by fixture updates (never-verified fixtures, distinct audit action) |
| | password-reset-surface, p64-c4-email-otp, email-verification-link-security | 54/54 |
| | auth-rate-limit, signin, register, security, SMI | 46/46 |
| Notification isolation | `notification-context-isolation.e2e-spec.ts` / unit `notification-context.spec.ts` | 9/9 (5 fail without scoping) / 85 |
| Communications + notifications e2e | 20 suites | 335 pass |
| Session cookie race | SC-07 plus refresh suites | 21/21; SC-07 fails without the fix |
| Devices | DV-01..10 / unit | 10/10 (4 fail on old code) / 39/39 |
| Customer requests | CR-01..10 / communications batch / mapper unit | 10/10 / 94/94 / 9 |
| Plans | 38 unit suites / p57 / 15 e2e suites / add-on suites | 593 / 19/19 / 190 / 78 |
| Frontend unit (final pre-merge) | `npx vitest run` | **292 files / 3645 tests, pass** |
| Frontend lint / types / build | `eslint`, `tsc`, `vite build`, `build:ssr`, `test:ssr` | 0 errors / clean / ok / ok / **97/97** |
| Frontend CI on PR #33 (`50d9b38`) and `main` (`a59be1f`) | GitHub `CI` | **Green** (main after re-run, §17) |
| J45 offline (production build) | `E2E_BASE_URL=http://localhost:3002 npx playwright test e2e/j45-offline-dashboard.spec.ts` | **2/2 (final, 9 Oct, merged code)** |
| J46 customer requests + J44 device dialog | `npx playwright test e2e/j46-customer-requests.spec.ts e2e/j44-device-limit-dialog.spec.ts` | **5/5 (final, 9 Oct, merged code)** |
| Full Playwright regression | All journeys on the dev server (J45 excluded) | 172 passed, 14 failed, 37 did not run (serial), 4 skipped, 38.2 min |

**How the 14 regression failures were handled:**

- **A real bug was found and fixed.** Restored offline copies counted as fresh, which caused J32 (18 vs 19) and J34 (stale palette). Fixed in `50d9b38`, with a regression test that fails without the fix.
- **The re-run of the 14 files gave a shifting set:** 35 passed, 9 failed, 33 did not run. J15, J24, J32, J33 and J37 passed on the re-run, while J6, J34 and J35 failed in different tests.
- **J1, J2 and J23 fail identically on `origin/main`'s frontend,** on the same stack, so they are pre-existing or environmental.
- **J6, J34, J35, J36, J41 and J8b varied between runs.** They were **not** compared against `main`, so whether they are pre-existing is **Not verified**.
- **One local-only failure:** `p64-phase2-security` "unsigned read" fails because the local s3rver serves anonymous GETs. Not related to this work.

**Not run:**

- dedicated accessibility (axe) scans of the new pages;
- visual-regression baselines for the new pages;
- load tests.

---

## 17. Production Deployment

**Branches:** `claude/confident-bardeen-s216dw` in both repositories.

**Merge order (backend first):**

1. **atlas-backend#41 merged** (`88b1fb4`).
2. **Deploy #263** (automatic after CI) **failed:** "no space left on device" while pulling the image. No migration ran.
3. **Deploy #264** (manual, `apply_migrations=true`) **failed:** out of space while copying `.env`.
   - `set -e` aborted before the `mv`, so `.env` was untouched. No migration ran, and production stayed up on the previous version.
4. **atlas#33 was merged before the backend was live** (`a59be1f`). Review found that the new frontend was incompatible with the old backend:
   - the 2FA confirm request sends `password`, which the old backend rejected with 400 (`forbidNonWhitelisted`);
   - Customer Requests returned 404.
   - With the owner's approval, frontend CI run `37898083019` was cancelled, so frontend Deploy #150 was skipped.
5. **The VPS disk was freed manually** (§19).
6. **Deploy #265** (manual, `apply_migrations=true`, approved through the protected `production-migrations` environment) **succeeded:**
   - backup;
   - pre-migration evidence;
   - the 4 migrations;
   - backend recreated and healthy;
   - Caddy and the renderer healthy;
   - last-good digests recorded for rollback (backend `sha256:854b979e…`).
7. **Frontend CI re-run on `a59be1f`: success.** That triggered frontend **Deploy #151: success**.

**Rollback:** `deploy.sh --rollback` restores the recorded last-good digests. The migrations are additive or data-only and delete nothing:

- notification context columns;
- plan JSON narrowing, which removed unused keys;
- device revocation (revoke, not delete);
- new tables.

**Note:** a frontend rollback below `a59be1f` would remove the UI for features the backend still serves. That is harmless, but the service-worker kill switch (`VITE_OFFLINE_SHELL=off`) is the intended way to disable offline mode without a rollback.

---

## 18. Production Verification

### Verified in production (by API / HTTP, 9 Oct 2026)

| Check | Result |
|---|---|
| Migrations applied | Deploy #265 log: the 4 migrations applied, "All migrations have been successfully applied" |
| Backend healthy | Deploy script health wait: "Backend healthy"; Caddy and renderer healthy |
| New routes live | `POST/GET /api/v1/academies/<id>/customer-requests` and `GET /api/v1/platform/customer-requests` return **401** (unauthenticated); an unknown route returns 404, so the 401 proves the route exists |
| Notifications route | `GET /api/v1/notifications` returns 401 unauthenticated (behaviour behind auth not checked) |
| Deployed service worker | `/sw.js` is byte-identical to the repository's `public/sw.js` |
| Deployed bundle | The production entry and vendor chunks contain the offline layer (`atlas-offline`, `atlas:cache-assets`, `atlas:pending-sign-out`) and the customer-requests code |
| Stale-tab asset fix | A missing `/assets/*.js` returns **404 `cache-control: no-store`** (previously 200 HTML); existing hashed assets return `public, max-age=31536000, immutable`; HTML returns `no-cache` |

### Verified only through automated, local or CI testing

Everything else in §3–§10, including:

- the offline journeys (J45);
- customer requests end to end (J46);
- the device dialog (J44);
- notification isolation (e2e);
- session races (SC-07);
- the ATO regressions.

### Not verified in production

The sandbox's browser cannot complete TLS to production through the egress proxy, and the deploy credentials were deliberately not used. These checks are pending the owner's manual checklist:

1. Header: Welcome trigger, appearance in the menu, language switcher.
2. Notification feeds in Management vs Academy A vs Academy B.
3. Customer request submit → Requests entry → Platform console → routing email delivery.
4. Offline reload of the dashboard and the banner.
5. Device list stability across sign-out and sign-in.
6. Plan pages (EN/AR) without the removed claims.
7. A stale tab idle beyond the access-token lifetime.

### Limitations

- `/health` through Caddy returns the SPA HTML fallback, so it says nothing about the backend. Backend health is checked inside `deploy.sh`.
- The number of production rows affected by the data migrations (device revocations, plan rows, notification backfill) was not queried.

---

## 19. Problems Discovered During Implementation

| Problem | Why | Diagnosis | Related? | Fix / prevention |
|---|---|---|---|---|
| Offline reload of the dashboard was blank | The cached entry chunk did not match because of `Vary: Origin` (module scripts send `Origin`) | J45 in Chromium | W1 | `cache.match(..., { ignoreVary: true })` |
| The blog prerender could become the offline shell; Caddy redirects `/index.html` | A navigation response is not always the app, and a redirected response cannot answer a navigation | Code review and J45 | W1 | Fetch `/index.html` directly and store a fresh `Response` |
| Queries fired offline after a reload | `onlineManager` starts "online" until an event arrives | J45 | W1 | Seed from `navigator.onLine` |
| Offline sign-out never left the server session pending | `authenticationService.signOut` swallowed the error | J45 | W1 | Propagate errors; `sign-out-delivery.test.ts` |
| Unread badge over-decremented | Duplicate IDs; items already read were counted | Unit tests | W1 | Distinct-ID set; decrement only items that were unread |
| "All changes synced" shown after Discard | Notice tied to the queue emptying | Unit test | W1 | Driven by `lastSyncedAt` advancing |
| Restored copies were fresh within `staleTime` | `hydrate` keeps the original `dataUpdatedAt` | Full regression (J32, J34) | W1 | `50d9b38`; regression test fails without it |
| Frontend CI race in `course-category-hidden` | Typing before the loaded course reset the form | CI log | No (pre-existing test) | `1026551`: wait for the loaded value |
| Sidebar hid Requests from academy Administrators | Organization permissions cannot tell an administrator from a manager | Review against the API rule | W2 | `academyRoles` on navigation items, decided by the verified academy role |
| 8 cross-repo backend specs failed until the frontend routes and labels existed | Specs check action URLs and translation coverage against the frontend | Backend spec run | W2 | Frontend routes and EN/AR keys added |
| Production disk full; deploys #263 and #264 failed | 421 Docker images (42 GB) accumulated; no pruning after deploys; no container log rotation | Deploy logs, then `df` and `docker system df` on the VPS | No (operational) | Owner ran `docker image prune -a` (35.65 GB reclaimed; 6.8 GB used, 38 GB free). Prevention recommended (§21). |
| Frontend merged before the backend was deployed | Merge timing | API contract review | Release process | CI run cancelled so the frontend could not deploy first; re-run after the backend was verified |
| Device: unreachable orphan rows and a "New device added" notice on every grant | Identity only issued under the cap; grant path had no `@Res` | Reproduced in Chromium | DV | §10 |
| Multi-tab refresh race signed every tab out | Backend cleared the cookie on any failed refresh | Investigation, then SC-07 | S | `bc50ecb` |
| Local Playwright run lost its stack after a container restart | Environment | — | No | `e2e-local-stack.sh start` + `serve` |

---

## 20. Architectural Decisions

**ADR-1 — Offline is read-mostly with a replay-safe outbox**

- **Context:** a multi-tenant dashboard where most writes are non-idempotent (create, pay, publish, delete) and the backend has no idempotency keys or deltas.
- **Options:**
  1. A full offline write queue with merge or CRDTs.
  2. Read-only offline.
  3. Read-mostly with a replay-safe outbox.
- **Chosen:** option 3.
- **Why:** it delivers navigation and reading offline without inventing conflict semantics, and the server stays authoritative.
- **Trade-off:** editing is unavailable offline.
- **Consequence:** each new queued kind must argue its replay safety in its handler.

**ADR-2 — Own IndexedDB wrapper, no library.** Three keyed stores and fail-closed semantics; easier to audit and no bundle growth. Dexie and idb were rejected (§3.2).

**ADR-3 — Minimal, network-first service worker on the platform host only**

- **Why:** the dashboard picks up a deploy at once, and an Academy website (server-rendered per tenant) is never cached.
- **Trade-off:** offline needs one prior online visit.

**ADR-4 — Offline data not encrypted.** A key available to the page sits next to the data. The real controls are the allowlist, per-user records, wipe on sign-out, and the TTL.

**ADR-5 — Notification context stored on the row and derived server-side**

- **Options:** client-side filtering; a client-sent scope; a server-derived scope.
- **Chosen:** server-derived, from the session record and host. A client parameter could be forged, and filtering on the client leaks data.
- **Edge cases:** account notices are shown everywhere; ambiguous rows are `unscoped` and shown nowhere (never guessed).

**ADR-6 — Customer-request routing through the existing outbox with an address recipient.** This reuses delivery, retries and templates. A partial unique index gives deduplication, and address rows carry no tenant IDs.

**ADR-7 — Device identity always issued; one termination path.** This fixes the root cause instead of patching the dialog, and immediate access-token denylisting makes "remove" mean "signed out now".

**ADR-8 — ATO F2/F1: remove 2FA on reset only for never-verified accounts.** Removing it on every reset was rejected because it would let a mailbox compromise bypass 2FA.

**ADR-9 — Navigation follows the verified academy role, with no new permission.** The sidebar matches the API rule (owner/administrator). Organization permissions cannot express academy roles.

**ADR-10 — Import cycles recorded as debt, not refactored in the release.** Confirmed harmless today (used only inside functions) and the release scope was kept focused (owner decision).

---

## 21. Future Recommendations

*These are recommendations, not completed work.*

**Security**

- Mandatory MFA for Platform Owners and organization owners (F11).
- Set the email-OTP flags to `new_device` on both surfaces, and verify the current production values.
- An absolute session lifetime cap (F10).
- Revisit the member-lookup name disclosure (F5) and the per-email sign-in budget (F7).
- Verify that the email provider's click tracking is off for credential emails (F13).
- Separate the unsubscribe HMAC key from the JWT secret.

**Operations**

- `deploy.sh`: prune unused images after a healthy deploy (keeping the current and last-good digests), and check free disk space before pulling.
- Docker log rotation (`max-size` / `max-file`) in `docker-compose.prod.yml`.
- A disk-usage alert in the existing Prometheus/Alertmanager stack.
- Expose a backend health path through Caddy, since `/health` currently returns the SPA.

**Offline**

- Delta or incremental endpoints (`updated_since`) before broadening the allowlist.
- More replay-safe outbox kinds, each with an explicit replay argument.
- Observability without personal data: outbox size, retry and conflict counts, storage-unavailable rate.
- Serve `/sw.js` with `Cache-Control: no-cache` to make update behaviour explicit (it is currently `max-age=14400`).
- A browser journey for Academy A → offline → Academy B, and for multi-tab draining.

**Quality**

- Compare the flaky Playwright journeys (J6, J34, J35, J36, J41, J8b) against `main`, and stabilise them.
- Axe and visual baselines for the new pages.
- Resolve TD-1 (move `useAcademyScope` to a shared module; import `normalizeUnknownError` directly).

**Product**

- Attachments on customer requests.
- SLA indicators in the Platform console.

---

## 22. Final Status

| Area | Status |
|---|---|
| Implementation | **Complete** for every task in scope (§2) |
| Testing | **Complete** for unit, e2e and the journeys listed in §16. Final J44/J45/J46 runs passed on the merged code. Full-regression flakes partly unresolved (§16). No axe, visual or load testing. |
| Security review | **Complete** (ATO review A–L; confirmed findings fixed; deferred items in §5.4) |
| CI | **Green**: atlas-backend PR #41 and `main` `88b1fb4`; atlas PR #33 and `main` `a59be1f` |
| Deployment | **Complete**: backend Deploy #265 (4 migrations applied) and frontend Deploy #151, 9 Oct 2026 |
| Production verification | **Partial.** API and build checks are verified (§18). Signed-in browser checks are **Not verified**, pending the owner checklist. |
| Known remaining issues | Deferred ATO items (§5.4); playwright journeys with intermittent failures, not yet compared against `main`; no image pruning or log rotation on the VPS (disk will fill again without it); TD-1 import cycles; `/health` through Caddy is not a backend health check |
