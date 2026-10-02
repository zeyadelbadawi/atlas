# Browser journeys (J1–J13)

Real Chromium against the real stack: Vite (:3001) → Nest API (:3000) →
PostgreSQL, Redis and an S3-compatible store. Nothing is mocked. The
theme baseline (`e2e/theme-baseline/`) is a separate suite with its own
config and fixture server.

## Running against a disposable stack

```bash
# atlas-backend: Postgres 54329, Redis 63799, s3rver 49000, migrations + seed,
# then API :3000 and Vite :3001 (refuses to run against a non-local database)
scripts/e2e-local-stack.sh up
scripts/e2e-local-stack.sh serve
# for J10 instead (the token is a throwaway local value):
#   openssl rand -hex 24 > /tmp/atlas-e2e-stack/metrics-token
#   RUM_ENABLED=true METRICS_SCRAPE_TOKEN=$(cat /tmp/atlas-e2e-stack/metrics-token) \
#   VITE_RUM_SAMPLE_RATE=1 scripts/e2e-local-stack.sh serve

# atlas
E2E_CHROMIUM=/opt/pw-browsers/chromium E2E_REDIS_URL=redis://127.0.0.1:63799 \
  npx playwright test --reporter=line
# J10 also needs E2E_METRICS_TOKEN_FILE=/tmp/atlas-e2e-stack/metrics-token and
# the servers started as above; otherwise it skips (it never fakes a pass).

scripts/e2e-local-stack.sh down             # atlas-backend: remove everything
```

Each journey seeds its own accounts through the API and leaves the shared
seed as it found it. Journeys run in order (`workers: 1`).

## What each journey proves

| Journey | Acceptance criteria covered | Roles |
|---|---|---|
| J1 assessment & certificate | Registration on the Academy site; timed quiz autosave, reload survival, auto-submit at expiry; assignment draft → submit → grade; completion; certificate issued, listed, downloaded via signed link, verified on both hosts; revocation reflected; a better retake never touches the certificate | Student, Manager |
| J2 surface enforcement | A learner is refused the management surface in the router, the UI and **the API** (raw token → 403 from every management controller); keeps the Academy surface; cannot sign in to another Academy | Student |
| J3 roster & RBAC | New learner appears for the Owner; staff grant a course; Manager reviews attempts and grades; Instructor works only on assigned courses; cross-Academy isolation for every staff principal | Owner, Manager, Instructor, Student |
| J4 certificate tenancy | A's certificate verifies as A's on every host; B's Owner cannot list, read, revoke or regenerate it | Owner A, Owner B, Student |
| J5 revocation | Paid course → approved payment → protected-content grant; refund ends access (grant refused, held lease refused, player blocked) | Student, Platform owner |
| J6 commerce & discovery | Catalog filter/search; details page; free preview; review moderation; paid checkout with proof; approval enrols | Visitor, Student, Owner, Platform owner |
| J7 Theme 1 starter content | Logo → palette persisted and rendered; default palette without a logo; sample testimonials stay private until confirmed | Organization Owner |
| J8 Theme 1 hardening | Edited samples stay private; Arabic public site RTL with no overflow at 390/1024/1440; Arabic dashboard; visible keyboard focus; retired themes refused for new Academies | Organization Owner, Visitor |
| J9 full-screen exam | Start enters full screen; leaving hides questions behind a gate; returning restores them; strict mode auto-submits at the limit and the reviewer sees every exit; unsupported/refused browsers get a notice and the reviewer sees why | Student, Owner |
| J10 real-user monitoring | LCP/CLS/INP recorded with the route template only; mobile label; Global Privacy Control sends nothing; a hostile beacon cannot create labels or carry data | Visitor, Platform owner |
| J11 quiz lifecycle (15 steps) | Instructor authors an exam with full screen; publish and place; Student (Arabic) takes it — rules, gesture, full screen, autosave, exit/return, offline, reload, submit, result; repeated submit, invalid payload, tampering and stale session fail safely; Instructor and Manager review an auditable integrity report; another organization can read or change nothing | Instructor, Manager, Student, Owner B |
| J12 content library | Owner picks and orders FAQ entries; anonymous EN/AR visitors see published entries in that order, never drafts, without calling the management API; edits and hides show on the next visit; no leak to another Academy | Owner, Visitor |
| J13 responsive & accessibility | 10 surfaces × 360/390/768/1024/1440/1920 × EN/AR: `lang`/`dir`, no horizontal overflow, landmarks, screenshots; axe (WCAG 2.1 A/AA, no serious/critical) at 390 and 1440; author content keeps its own direction; keyboard focus and dialog focus return | Visitor, Student, Owner |

What these journeys do **not** cover (no screen reader, Chromium only,
real tab switching cannot be produced headless) is listed in
`Reports/ACCESSIBILITY_AUDIT.md` §3 and `atlas-backend/Reports/ASSESSMENT_INTEGRITY.md`.
