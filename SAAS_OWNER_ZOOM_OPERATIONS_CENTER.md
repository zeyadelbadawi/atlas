# Atlas — SaaS Owner Zoom Operations Center

Platform/SaaS-Owner operational console for the Live Sessions (Zoom)
integration. This document describes the **implemented** system.

## 1. What this is for

A single place for an Atlas **platform operator** (not an academy owner) to
answer: *is Zoom / Live Sessions healthy across the whole platform right now,
and where is attention needed?* It is a monitoring, investigation and triage
surface — deliberately **read-only**. It performs no writes to any customer's
Zoom connection or sessions.

It is **not** the academy-facing Live Sessions UI (`/dashboard/add-ons/live-sessions/*`),
which is where an academy owner connects and manages their own Zoom. This
console spans every academy and organization.

## 2. Who can see it

Platform Owners only. Every route is guarded by `RouteGuard` with
`requiredRoles={['platform_owner']}`; every API endpoint by
`JwtAuthGuard + PlatformOwnerGuard`; every database read runs inside a
platform-owner RLS context. A non-owner is refused at all three layers —
hiding the menu is only a courtesy.

## 3. Navigation and routes

A nested `Zoom` group in the existing Platform sidebar section (reusing the
existing `NavigationItem.children` rendering — no new navigation system):

| Page | Route |
|---|---|
| Overview | `/dashboard/platform/zoom` |
| Connections | `/dashboard/platform/zoom/connections` |
| Live sessions | `/dashboard/platform/zoom/live-sessions` |
| Attendance | `/dashboard/platform/zoom/attendance` |
| Recordings | `/dashboard/platform/zoom/recordings` |
| Webhooks & events | `/dashboard/platform/zoom/events` |
| Health & incidents | `/dashboard/platform/zoom/health` |
| Activity | `/dashboard/platform/zoom/activity` |
| Academy detail | `/dashboard/platform/zoom/academies/:academyId` |

## 4. Backend APIs

All under `@Controller('platform-zoom')`, all GET, all guarded:

| Endpoint | Purpose |
|---|---|
| `GET /platform-zoom/overview` | Bounded aggregates + attention + at-risk + recent activity |
| `GET /platform-zoom/connections` | Per-academy connection list (server-side search/filter/paging) |
| `GET /platform-zoom/live-sessions` | Operational session list |
| `GET /platform-zoom/attendance` | Reconciliation health list |
| `GET /platform-zoom/recordings` | Recording lifecycle list |
| `GET /platform-zoom/events` | Provider events + health counts |
| `GET /platform-zoom/health` | Active issue groups with sample academies |
| `GET /platform-zoom/activity` | Audit timeline (the 5 real Zoom actions) |
| `GET /platform-zoom/academies/:academyId` | One academy's complete Zoom picture |

## 5. What each page shows, and where the data comes from

Every metric is traced to a persisted source. Nothing is invented telemetry.

### Overview
- **Connection tiles** (Connected / Reconnect required / Revoked / Not connected)
  — grouped counts over `academy_live_provider_connections`; "Not connected"
  is academies with no connection row.
- **Session tiles** (Live / Upcoming / Failed / No Zoom meeting) — grouped
  counts over `live_sessions`; "No Zoom meeting" = `provider_meeting_id IS NULL`.
- **Needs attention** — a projection of the above counts, zero-count rows dropped.
- **Upcoming sessions at risk** — scheduled/live sessions within 24h whose
  academy has no live connection or no provider meeting.
- **Recent activity** — last 10 of the five real Zoom audit actions.
- **Explore** — quick links to every sub-page.

### Connections
Row per **academy** (so academies that never connected still appear):
academy, organization, status, **masked** Zoom account, connected date, last
checked. Source: `academies` ⟕ `academy_live_provider_connections` +
`tenant_add_ons` (install state). Server-side search (academy/org) and status
filter. Academy name links to Academy detail.

### Live sessions
Session operational state: academy, org, course, scheduled start, status,
Zoom-meeting provisioning, recording. "At risk" filter. Source: `live_sessions`
(+ `courses`, `users`, `live_session_recordings`). There is deliberately **no
"provider unavailable" status** — that value does not exist in the domain;
provider failure surfaces as `failed` + the stored `failureReason`.

### Attendance
Reconciliation health, **derived** from stored fields (never a new column):
`reconciled` (attendanceReconciledAt set) / `pending` (ended, unreconciled,
within the 5-attempt budget) / `failing` (attempts exhausted) / `not_due`
(not ended). Participant count is a DB `_count`. Source: `live_sessions` +
`live_session_participants`. **Read-only** — no manual attendance override
exists in the backend, so none is offered.

### Recordings
Recording lifecycle: status, file count, quota flag, created. **Quota is one
unit per session** — the flag reflects the stored `quotaConsumedAt`, never a
count of files. Source: `live_session_recordings` (+ file `_count`).
Per-organization quota totals ("X / Y recorded sessions") appear on Academy
detail, not here, to avoid a per-row entitlement query.

### Webhooks & events
Zoom event delivery/processing: health tiles (Processed / Received /
Unmatched / Failed) and a row list (event type, status, academy, session,
received). Source: `live_provider_events`. **Signature-verification failures,
replayed/stale requests and malformed bodies are intentionally absent** —
they are rejected before any row is persisted, so there is no data for them,
and this task does not add a telemetry system to manufacture it.

### Health & incidents
Active operational conditions grouped by kind and severity (critical/warning),
each with a few sample academies that deep-link to Academy detail. These are
**current conditions derived from live state**, not an incident-lifecycle
table — there is no resolve/acknowledge workflow, because the data does not
model one. A group disappears when the underlying state changes.

### Activity
Chronological timeline of the **five audit actions the integration actually
writes**: `live_provider.connected`, `live_provider.disconnected`,
`live_provider.deauthorized`, `live_session.created`, `live_session.published`.
Source: `audit_log_entries`. No other actions are invented to fill it.

### Academy detail
One academy's whole Zoom picture: connection status + **masked** account,
session counts, attendance reconciliation, recording lifecycle, the
**entitlement-backed quota** ("Recorded sessions X / Y" via the real
`RecordingQuotaService.describeUsage`, never counted from files), upcoming
at-risk sessions, and recent activity.

## 6. Security / RLS

- **Guard decides, RLS independently agrees.** `PlatformOwnerGuard` gates the
  API; the service reads inside `runInUserContext(platformOwnerId)`, where
  Postgres re-evaluates `is_platform_owner` per row.
- Migration **`p50_zoom_ops_platform_select`** adds SELECT-only,
  platform-owner-only policies to four tables that were tenant-isolated
  (`tenant_add_ons`, `live_session_recordings`, `live_session_recording_files`,
  `live_session_attendance_intervals`), continuing the P46 pattern. No tenant
  policy was widened; no write policy was added.
- **No secrets ever leave the backend**: no tokens, credentials, fingerprints,
  client/webhook secrets, or raw payloads. The Zoom account id is the only
  provider identifier shown, and it is **masked** (`abc••••••xyz`).

## 7. Read-only vs actionable

Entirely read-only. There are no write actions, by design — operational
changes to a customer's Zoom belong to that academy's owner, not to a platform
operator with a button.

## 8. Real vs derived data

- **Real (stored):** all connection/session/recording/event rows and counts;
  audit activity; entitlement quota.
- **Derived (computed from stored fields, not new telemetry):** attendance
  reconciliation state; "at risk"; the Health & incidents groupings; the
  Overview "needs attention" projection.

## 9. Known limitations / deferred

- **Security signals** (bad-signature / replay / malformed webhook attempts)
  are not shown — not persisted; would require a new telemetry system (out of
  scope).
- **Activity** covers only the five persisted audit actions; richer lifecycle
  events (rescheduled/cancelled/started/ended/reconciliation-failure/
  recording-failure) would require adding audit writes to Live Sessions write
  paths — intentionally deferred.
- Read-only: no manual reconciliation or connection actions.

## 10. Verification status

- Backend: 64 unit suites / 797 tests; **18/18** real-PostgreSQL RLS/security
  e2e (`test/platform-zoom-operations.e2e-spec.ts`). Typecheck/lint/build clean.
- Frontend: **18/18** component tests; typecheck/lint/build clean.
- Real browser (Platform Owner, real dev DB): all nine pages render real data;
  masked account ids; no raw i18n keys; Arabic/RTL verified; API returns
  401 unauthenticated and 403 for a tenant user; secret scan of live responses
  clean.
- Production: see the final implementation report for deployed SHAs and
  production verification evidence.
