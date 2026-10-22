# Flaky and quarantined journeys

The tracking list for B0-OPS-11. CI (`.github/workflows/journeys.yml`)
runs the journeys in two sets:

- **critical** — every test tagged `@critical`, on every pull request into
  `main` and every push to `main` (the `Critical journeys` job of `CI`).
- **full** — every journey, nightly at 01:30 UTC and on demand
  (Actions → Journeys → Run workflow).

A test tagged `@quarantine` is left out of both blocking runs. The nightly
run then runs the quarantined tests on their own, in a step that never
fails the job, and uploads their report (`journeys-full-report`), so each
entry below can be confirmed or cleared from evidence rather than memory.

Tags are written in the title (`test.describe('J34 — … @quarantine', …)`),
so `--grep @critical` / `--grep-invert @quarantine` select them.

## How to use this list

- **Quarantine** a test only with a row below: the journey, the test, what
  varies, the first evidence (a run link or a report section), and the
  date. Never quarantine a test that fails the same way every time — that
  is a bug, not a flake.
- **Release** it (remove the tag and the row) after it passes in five
  consecutive nightly quarantine runs, or once the cause is fixed with the
  fix linked here.
- A `@critical` test is never quarantined silently: if one flakes, fix it
  or move it out of the critical set in the same change, and say so here.

## Quarantined

| Journey | Test(s)                                                                                      | What varies                                                | Evidence                                                                                                                                                                       | Since      |
| ------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- |
| J8b     | `J8b: the public site in Arabic at …px is RTL with no overflow` (all widths)                 | passed and failed on the same code between full local runs | Engineering initiative report §16 ("J6, J34, J35, J36, J41 and J8b varied between runs"); not compared against `main`                                                          | 2026-10-14 |
| J34     | the whole file (`J34 — the cookie banner follows each Academy’s palette`)                    | failed in different tests on a re-run of the same code     | same report, §16                                                                                                                                                               | 2026-10-14 |
| J35     | the whole file (`J35 — provisioning progress`)                                               | failed in different tests on a re-run of the same code     | same report, §16                                                                                                                                                               | 2026-10-14 |
| J36     | `j36-platform-email-monitoring.spec.ts` (`J36 — Platform Owner email & security monitoring`) | varied between runs                                        | same report, §16 (it names "J36"; the other J36 file, `j36-academy-offline`, skips itself outside a production build on an academy host, so this is most likely the one meant) | 2026-10-14 |
| J41     | the whole file (`J41 — gifted setup days on the first paid subscription`)                    | varied between runs                                        | same report, §16                                                                                                                                                               | 2026-10-14 |

## Watched (flaky history, not quarantined)

| Journey | Why it is not quarantined                                                                                                                                                                                                                                              | Evidence                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| J6      | It is in the critical set (commerce: catalog, paid checkout with proof, approval enrols). The same report lists it as varying between runs; it stays blocking so a commerce regression cannot merge unnoticed. If it flakes in CI, fix it rather than quarantining it. | report §16; History below |

## Not run in CI (environment, not flakiness)

| Journey                                             | Why                                                                                                                                    | What would run it                                                                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| J10 real-user monitoring                            | skips itself unless the backend runs with RUM on and a metrics token file is given                                                     | start the backend with `RUM_ENABLED=true METRICS_SCRAPE_TOKEN=…` and set `E2E_METRICS_TOKEN_FILE`                          |
| J36 academy offline (`j36-academy-offline.spec.ts`) | skips itself unless `E2E_BASE_URL` is a production build on an `*.atlas.test` academy host                                             | see the file header                                                                                                        |
| J45 offline dashboard (tagged `@production-build`)  | needs a production build (`vite build && vite preview --port 3002`); the job serves the dev server, so the full run leaves the tag out | a second app server in the job and `E2E_BASE_URL=http://localhost:3002 pnpm exec playwright test --grep @production-build` |

## History

- 2026-10-14 — list created (B0-OPS-11) from the engineering initiative
  report's §16; quarantine applied to J8b, J34, J35, J36 (email
  monitoring) and J41.
- 2026-10-15 — first local runs of the critical set against a fresh
  database (backend `main`, the CI job's setup) on an overloaded shared
  machine (load average ~30 on 4 cores). On a fresh database J6, J27 and
  J42 could not work at all: their fixtures were older than backend
  B0-LRN-05 (course prices EGP only), B0-LRN-03 (publishing needs a
  published activity), and they needed the website's Course details page,
  which nothing publishes on a fresh database. All three are fixed in the
  same change. The tests that still failed there (J38a/J38b, J42 step 2,
  J6 "a learner registers…") ended on blank pages, with Chromium logging
  `net::ERR_INSUFFICIENT_RESOURCES` while loading the dev server's modules
  in the J6 and J42 traces. J38a passed in another run; J38b, J42 step 2
  and J6 step 4 have not yet passed locally, so whether they are machine
  load or real is open. Not quarantined: the first CI runs decide.
- 2026-10-21 — the dev-server blank pages explained. The nightly run had J1
  (a different step each run) and J47 ("Target crashed") failing; locally
  J1 failed on 4 of 4 runs, each time at a different step, every time on a
  blank page with `net::ERR_INSUFFICIENT_RESOURCES` on the dev server's
  modules (~1,400 per page load) or a renderer crash, and never on an app
  request loop (141 API requests in the whole file) or memory (renderer peak
  ~620 MB). The journeys job now serves a development-mode build with
  `vite preview` (`journeys.yml`; `import.meta.env.DEV` keeps the academy
  preview parameter): J1 passed 3 of 3 there, in half the time, and a full
  local run took 29 min instead of the job's 52. J7c (publish raced the
  page save) and J46 (reply typed before the composer cleared) were test
  races, fixed in the same change.
- 2026-10-22 — first nightly run on the development-mode build: 192 passed,
  one non-quarantined failure, J7a, which read the call-to-action's hue as
  NaN (the CI's Chrome reported the computed colour in a syntax the test's
  string parser did not read; it passed on the local Chromium). The hue is
  now read back through a 1×1 canvas (sRGB whatever the syntax) and polled
  until the button is painted. Not quarantined: a test bug, fixed.
