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
| J15 quiz-only progress | A quiz-only course (2 published quizzes, no lessons) and a mixed course (1 lesson + 1 quiz) read "0 of 2 activities completed" on My Learning in EN and AR (RTL); passing one quiz → "1 of 2", the second (on screen) → "2 of 2" and Completed; the public catalog card and details page name the quizzes, never "0 lessons" | Owner, Student, Visitor |
| J16 bank transfer | Platform Owner adds a bank account in the console dialog (bad IBAN refused client-side) and enables it; an Organization owner checks out a plan Yearly (Monthly/Yearly offered, yearly catalog price), gets the exact bank instructions (EN and AR, RTL), uploads a PNG receipt → awaiting review; approval in the review UI makes the plan active on a yearly cycle; a second organization's payment is rejected with a note it can read; that owner cannot open the first organization's payment (UI and API). Both screens read every page, so it holds on a catalog of any size | Platform owner, Organization owners A and B |
| J17 academy favicon | The Owner uploads a PNG favicon on the Branding page; the public site in EN and AR (RTL) links exactly one icon, the Academy's versioned favicon URL, which serves the uploaded bytes; a second upload changes the URL on the next visit; an Academy without one keeps the platform `/favicon.svg`. Restores the seed favicon | Owner, Visitor |
| J18 academy page metadata | Published pages (EN/AR, FAQs), sign-in and Coming Soon (EN/AR; the second seeded Academy is unpublished for the test and republished) are titled and described as the Academy — never "Atlas", one description, no Atlas copy; moving between two Academy sites in one tab leaves nothing of the first | Visitor |
| J19 academy messages | A visitor sends a Contact form message (and one via the public API); the Owner finds both on Website → Messages by search (kept in the URL across a reload), opens one (marked read; text shown as text, mailto reply), archives it (status filters), restores it; another Academy's Owner is refused by the API | Visitor, Owner, other Owner |
| J35 provisioning progress | Logo + palette chosen in the setup form are sent with the request (no data URI) and applied by the server; the status page shows four real stages (no percentages), reaches ready, and a reload restores the same state at 390 px; two tabs for one address → one 201, one 409 naming the request to follow; a stalled request offers Retry, which resumes it; the Arabic status page is RTL with translated stages. Needs the integrated rebuild (W2 backend) | Organization Owner |
| J43 footer social links | Website → Settings → Navigation: a social link's platform is picked from the catalogue (no free-text platform field), saved as `platform: 'instagram'`; an unsafe address is refused; a legacy free-text link (`facebook`, no platform) reads as Facebook in the CMS; publish; in Theme 1, Atelier, Manara and Riwaq (EN 1440, AR 390) the footer draws both as icon links named by their platform, shows the Academy's own description and a Learning group in a "Footer" navigation landmark, with no sideways scroll. Restores the seed theme, footer and description | Owner, Visitor |
| J20 e-wallet & InstaPay | Platform Owner's console shows the seeded wallet/InstaPay placeholders flagged ("Placeholder — replace before enabling", placeholder summary) and never touches them; adds a Vodafone Cash wallet in the E-wallets dialog (invalid number refused client-side, nothing sent; EN+AR holder and instructions; stored normalized `01000000001`) and an InstaPay address (invalid address refused), enabling each from its row; owner A's checkout labels Bank transfer / E-wallet + Vodafone Cash / InstaPay, the wallet payment page shows provider, number (copy button) and holder, in Arabic RTL with the Arabic holder and instructions; PNG receipt → awaiting review → approved in the review UI → subscription active; owner B pays by InstaPay (address + holder), is rejected with a note it can read; B cannot open A's wallet payment ("Payment not found", API 403/404, number never shown). Placeholders verified still disabled afterwards. Holds on a catalog of any size (both screens read every page) | Platform owner, Organization owners A and B |
| J44 device-limit dialog | Academy device limit 2: browsers A and B each register one device (one "New device added" each); browser C signs in at the limit and is given a device identity but registers nothing; its lesson is refused (403 `deviceLimit`) and the dialog lists both devices; removing one (the same endpoint Settings → Devices uses) is followed by exactly ONE grant, which succeeds — the dialog closes, C is one new device with one announcement, and a reload is the same device. Restores the academy's device policy and the temporary lesson body | Student (three browsers) |
| J45 offline dashboard | **Production build** (`vite build && vite preview --port 3002`, `E2E_BASE_URL=http://localhost:3002` — the app-shell worker exists only there). Online once: the shell worker installs, only allowlisted reads are saved and only for this user. Offline + reload: the dashboard opens from the worker and the saved copies, read-only, with the offline banner. Offline mark-read updates the badge and is queued; back online it reaches the server (that notification only). Sign-out offline: the tab signs out and the store is wiped, the server session stays live until the next online start, which revokes it first. The next person's saved records are only theirs. Without IndexedDB, sign-in and the dashboard work as before. Deletes its notifications | Owner, Manager |

What these journeys do **not** cover (no screen reader, Chromium only,
real tab switching cannot be produced headless) is listed in
`Reports/ACCESSIBILITY_AUDIT.md` §3 and `atlas-backend/Reports/ASSESSMENT_INTEGRITY.md`.
