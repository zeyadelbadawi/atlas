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

| Journey | Why it is not quarantined                                                                                                                                                                                                                                              | Evidence                                  |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| J6      | It is in the critical set (commerce: catalog, paid checkout with proof, approval enrols). The same report lists it as varying between runs; it stays blocking so a commerce regression cannot merge unnoticed. If it flakes in CI, fix it rather than quarantining it. | report §16; local run for B0-OPS-11 below |

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
