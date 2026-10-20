# Help Center screenshots

Every step of a help article (`content/docs/{en,ar}/**.md`, see
`content/docs/README.md`) has a screenshot: English articles show the English
interface, Arabic articles the Arabic interface (RTL). They are captured from
a **local** stack seeded with fake demo data:

```
scripts/docs/
  stack/       local stack: env, reset the demo database, start the API and the app, stop
  seed/        the demo dataset, created through the real HTTP API (state.json = generated ids)
  lib/         capture helpers (i18n keys, spec loading, Playwright, WebP)
  capture.mjs  content/docs/shots/*.yaml → content/docs/media/<lang>/<key>-<width>.webp + manifest.json
```

Nothing here talks to production. Every script refuses to run when a
database, Redis, S3, API or app URL points anywhere but this machine, and
refuses the database names other local work uses (`atlas_ci*`, `atlas_e2e*`).

## Requirements

- `../atlas-backend` checked out next to this repo, with its `node_modules`.
- PostgreSQL 16 on localhost:5432 with the local roles `atlas` (password
  `atlas_ci_password`) and `atlas_app` (`atlas_app_dev_password`), reachable as
  the `postgres` superuser over the Unix socket (to create the database).
- Redis on 127.0.0.1:6379 (the demo uses database index **7** only).
- A local S3-compatible store on 127.0.0.1:9000 (e.g. the SeaweedFS `s3`
  container used by CI, keys `atlas_media_ci` / `atlas_media_ci_password`,
  bucket `atlas-media-ci`).
- Chromium for Playwright (default `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`,
  override with `DOCS_CHROMIUM`), Python 3 with Pillow (WebP).

All values are local-only placeholders. The API's secrets (JWT, webhook,
encryption key) are generated on first use into `$DOCS_STACK_DIR/backend.env`;
nothing is read from, or written to, a real `.env`.

## Run it

```bash
# 1. Stack (API on 127.0.0.1:3100, app on http://localhost:3111)
scripts/docs/stack/reset-db.sh          # drop + recreate atlas_docs, migrations, plan catalog
scripts/docs/stack/start-backend.sh     # builds ../atlas-backend into $DOCS_STACK_DIR and starts it
scripts/docs/stack/start-frontend.sh    # Vite dev server of this repo, /api proxied to the docs API

# 2. Demo data (~40 s)
pnpm docs:seed                          # all steps; --only 04 / --from 05 for one step / the rest

# 3. Screenshots (both languages, ~10 s a shot)
pnpm docs:capture
pnpm docs:capture -- --only selling/              # keys starting with a prefix (repeat or comma-separate)
pnpm docs:capture -- --only selling/payment-methods --lang ar
pnpm docs:capture -- --changed                    # only shots whose spec or app commit changed

scripts/docs/stack/stop.sh              # stop the API and the app (data kept)
```

`start-backend.sh --no-build` restarts the last build. The capture switches
the demo content between its English and Arabic editions before each language
(`node scripts/docs/seed/locale.mjs en|ar`; `--keep-data-locale` skips that).
There is no separate finalize step: `capture.mjs` writes the WebPs and the
manifest itself. PNG masters stay outside the repo in `$DOCS_MASTERS_DIR`.

Environment overrides (defaults in brackets): `DOCS_STACK_DIR`
[/tmp/atlas-docs-stack], `DOCS_DB_NAME` [atlas_docs], `DOCS_PG_HOST`/`PORT`,
`DOCS_PG_ADMIN_USER`/`PASSWORD`, `DOCS_PG_APP_PASSWORD`, `DOCS_REDIS_URL`
[redis://127.0.0.1:6379/7], `DOCS_S3_ENDPOINT`/`ACCESS_KEY`/`SECRET_KEY`/`BUCKET`,
`DOCS_API_PORT` [3100], `DOCS_APP_PORT` [3111], `DOCS_APP_URL`
[http://localhost:3111], `DOCS_MASTERS_DIR` [/tmp/atlas-docs-masters],
`DOCS_CHROMIUM`, `DOCS_BACKEND_DIR` [../atlas-backend].

## Shot specs

`content/docs/shots/<category>.yaml` is a YAML list. One entry = one
screenshot, captured in English and Arabic.

```yaml
- key: selling/payment-methods          # <category>/<name>, lowercase-hyphen, unique
  as: owner                             # owner | manager | instructor | learner | visitor
  surface: dashboard                    # dashboard | academy | platform
  path: /dashboard/academy/{academyId}/payment-methods
  viewport: desktop                     # desktop (1440×900, default) | mobile (390×844)
  waitFor: { text: payments:academyMethods.title }
  actions:
    - click: { role: button, name: payments:academyMethods.editFor, nth: 0 }
  highlight: { label: payments:bankTransferMethods.fields.accountNumber }
  clip: dialog
```

| Field | Meaning |
|---|---|
| `as` | `owner` Nour, `manager` Karim, `instructor` Mona (all sign in at `/auth/sign-in`); `learner` Salma, signed in on the academy site; `visitor` signed out. One session per role and language is reused for every shot. |
| `surface` | `dashboard`: app routes as written. `academy`: the demo academy's public site and learner area (`/`, `/courses/…`, `/my/…`); on localhost the capture adds `?__atlas_academy_preview=al-nour` and, for Arabic, the site's `/ar` prefix. `platform`: signed-out platform pages (`/auth/register`). |
| `path` | Real route (`src/app/routes/route-paths.ts`) with `{placeholders}` from the seed (below). An unknown placeholder fails the shot. |
| `waitFor` | `{ text: <value> }` or `{ selector: <css> }`: must be visible before anything else happens. Then the page settles (network idle, fonts, images, no skeleton / spinner / `aria-busy` in view). |
| `actions` | In order: `click`, `hover`, `fill` (`{ <locator>, value }`), `press` (`Enter`, or `{ key, <locator> }`), `scroll` (`{ <locator> }` → into view, or `{ y: 600 }`), `wait` (ms, ≤ 2000). |
| `highlight` | One locator or a list: a navy (#1B3A8C) 3 px rounded outline, offset 4 px, drawn as an overlay element at capture time (pixels are never edited). |
| `clip` | `dialog` (the open `role=dialog`/`alertdialog`, 24 px padding), a CSS selector or a locator: capture only that box (clamped to the viewport; scroll inside a tall dialog first). Default: the viewport. |
| `fullPage` | `true` captures the whole page height instead of the viewport. |

**Locators**: `{ role, name?, nth? }`, `{ text }`, `{ label }`, `{ testId }`,
`{ selector }`; add `nth: <n>` (0-based, `-1` = last) and `exact: true` when
needed. Only visible elements match. While a dialog is open, a match inside it
wins over one behind it.

**Text values** (`name`, `text`, `label`, `waitFor.text`, `fill.value`):

- an i18n key `namespace:key.path` → the string from
  `src/localization/resources/<lang>/<namespace>.json` (plural `_other`/`_one`
  forms are found too). `{{interpolation}}` and `<0>`/`<terms>` markup match
  anything, e.g. `payments:academyMethods.editFor` ("Edit {{method}} details")
  matches the "Edit Bank transfer details" button. For `name` and `label` a key
  matches the **whole** accessible name/label (a trailing `*` is allowed); for
  `text` it may be part of a longer text. An unknown key fails the shot.
- `{ en: "...", ar: "..." }` → that language's literal (use it for demo data,
  e.g. `{ en: Limits and continuity, ar: النهايات والاتصال }`);
- any other string → used for both languages (substring match).

**Checks before the capture** (a failure is reported with key, language and
reason; the run continues and exits non-zero): the dashboard session is valid
(no redirect to sign-in), `<html dir>` is `rtl` for Arabic and not `rtl` for
English, no Vite error overlay. Cookie banners, toasts and dev-only overlays
are hidden; the browser has light theme, `Africa/Cairo`, `ar-EG`/`en-US`
locale, `Accept-Language`, the stored language (`atlas:language`), decided
cookie consent, device scale factor 2, reduced motion. Staff open the main demo
academy (the app's "last academy" preference). Nothing is masked: all data is fake.

## Output

`content/docs/media/<lang>/<key>-<width>.webp` (quality 80, stepped down to
keep the largest file ≤ 120 KB, floor 62): desktop 960 + 1440 px, mobile 390 +
780 px (a clip narrower than a width is not upscaled; its own width is used).
`content/docs/media/<lang>/manifest.json`, sorted, 2-space JSON:

```json
{
  "selling/payment-methods": {
    "capturedAt": "2026-10-20T08:50:06.531Z",
    "commit": "<frontend git sha at capture>",
    "files": [
      { "src": "media/en/selling/payment-methods-960.webp", "width": 960 },
      { "src": "media/en/selling/payment-methods-1440.webp", "width": 1440 }
    ],
    "height": 900,
    "spec": "<sha1 of the YAML entry>",
    "width": 1440
  }
}
```

`width`/`height` are the captured area in CSS pixels (1440×900 for a desktop
viewport, 390×844 for mobile, the clip box for a clip); the files are 1× and
2× renderings of it. `--changed` compares `spec` and `commit` (committed HEAD:
uncommitted app changes do not count as a change).

## Placeholders (`seed/state.json`)

| Placeholder | What it is |
|---|---|
| `{organizationId}` | the demo organization "Al-Nour Learning (demo)" |
| `{academyId}`, `{academySlug}` | main demo academy «أكاديمية النور» / Al-Nour Academy, slug `al-nour` |
| `{secondAcademyId}`, `{secondAcademySlug}` | second academy of the same organization, Al-Nour Kids / «النور للأطفال», `al-nour-kids` |
| `{ownerId}`, `{managerId}`, `{instructorId}`, `{invitedStaffId}` | user ids: owner Nour, manager Karim, instructor Mona, pending invitation Dina |
| `{courseId}`, `{courseSlug}` | published PAID course "Calculus Essentials" (850 EGP), instructor Mona assigned, certificates on |
| `{freeCourseId}` | published free course "Study Skills Starter" |
| `{englishCourseId}` | published paid course "English Grammar Basics" (450 EGP) |
| `{draftCourseId}` | draft course "Physics: Mechanics" |
| `{sectionId}` | unit 1 of `{courseId}` ("Limits and continuity") |
| `{lessonId}` | YouTube lesson in `{courseId}` ("What is a limit?", free preview) |
| `{linkLessonId}` | link lesson in `{courseId}` ("Limits worksheet (PDF)") |
| `{quizId}` | quiz "Limits check-up" in `{courseId}`: single, multiple choice, true/false, short answer and essay questions; required for completion |
| `{quizAttemptId}` | Salma's attempt, essay awaiting grading |
| `{assignmentId}` | assignment "Derivatives problem set" in `{courseId}` |
| `{submissionId}` | Salma's submission, awaiting grading (Omar's is graded) |
| `{certificateTemplateId}` | the academy's certificate template |
| `{certificateId}`, `{certificateCode}` | Omar's issued certificate and its verification code (`/verify/{certificateCode}`) |
| `{learnerId}`, `{learnerEmail}` | Salma: active learner with progress (the `learner` role) |
| `{completedLearnerId}` | Omar: completed `{courseId}` |
| `{blockedLearnerId}` | Youssef: blocked |
| `{pendingLearnerId}` | Laila: awaiting approval |
| `{expiringEnrollmentId}` | Ziad's manual enrollment in `{courseId}`, expires in 60 days |
| `{orderId}`, `{paymentId}` | Ali's order for `{courseId}`, pending review, wallet receipt uploaded |
| `{approvedOrderId}` | Salma's approved order (InstaPay) |
| `{rejectedOrderId}` | Mariam's rejected order (bank transfer) |
| `{pageId}` (= `{homePageId}`), `{aboutPageId}` | website home and about pages |
| `{announcementId}`, `{courseAnnouncementId}`, `{draftAnnouncementId}` | published academy / course announcement, draft |
| `{messageId}` | academy message sent in-app to the calculus learners |
| `{ticketId}` (= `{supportCaseId}`) | open support ticket from the owner |
| `{inviteId}`, `{inviteToken}` | invite link (30 uses, 14 days) and its token |
| `{customDomain}` | `learn.al-nour.example.com`, status `verification_required` |

## Demo data (all fake)

Password for every account: `AtlasDocs#2026demo`. Emails use `example.com`,
phones `010 0000 00xx`.

- **Platform system account** `platform.system@example.com` (SQL, never shown):
  background jobs (notifications, messages) need a platform owner to run.
- **Owner** Nour Hassan «نور حسن», `nour.owner@example.com`, organization
  "Al-Nour Learning (demo)" on the Enterprise trial (2 academies allowed),
  onboarding finished.
- **Academies** al-nour (default theme, published; sample copy replaced, no
  testimonials / statistics / categories sections, so no testimonials, ratings
  or student counts on public pages — XA-07) and al-nour-kids.
- **Staff** manager Karim Adel `karim.manager@example.com`, instructor Mona
  Fathy `mona.instructor@example.com` (both accepted), pending invitation Dina
  Farouk `dina.invited@example.com`.
- **Payment methods** bank transfer (Demo Bank Egypt, account
  0000111122223333), Vodafone Cash wallet 01000000009, InstaPay
  `nour.academy@instapay`, with English and Arabic instructions.
- **Courses** as in the placeholders: YouTube lessons (fake video ids), link
  lessons (`files.example.com`), quiz, assignment, certificate template.
- **Learners** `<name>.learner@example.com`: salma, omar, hana (free course
  in progress + English via wallet), ali (pending review), mariam (rejected),
  youssef (blocked), laila (pending approval), ziad (manual enrollment with
  expiry). Fake receipts say "DEMO RECEIPT".
- **Other** academy + course announcements, an academy message, a support
  ticket, two contact-form messages, a custom domain awaiting verification,
  notifications generated by all of the above. Dates are spread over the last
  two months (SQL, timestamps only).

Direct SQL is used only where the API cannot express the fact: verified
mailboxes and accepted staff invitations (the stub email provider keeps the
links in memory), the platform system account, backdated timestamps, the
learner's device slots before a capture, and, for the Arabic edition, quiz
question texts, people's display names and order snapshots.

Not producible locally: a **refund** (Atlas answers
`errors.courseOrder.refundContactAcademy` for manual payments: the academy
refunds outside Atlas); a **verified** custom domain (no DNS).
