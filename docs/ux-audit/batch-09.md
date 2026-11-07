# B9 — Academy public website, all four themes (Nov 2026)

Every page type the router produces, in `modern-education`, `atelier`, `manara` and `riwaq`:
home, about, courses catalog, course detail (free, paid, enrolment states), FAQs, contact,
custom pages, the four page templates, 404, coming soon, unavailable and suspended states,
certificate verification; sign-in, sign-up, forgot/reset password, verify email and Google
return on the academy host; the cookie layer. Every section type (32), all 41 presets and the
custom-section layouts were rendered with long, missing, broken and mixed-language content.
Local stack; the published theme of one academy switched in turn and restored; extra pages and
courses mocked with the real response shapes; every write answered by the test. EN-1280,
AR-375, AR-1280, EN-768 (home, course), 1440 (home). 1,350 screenshots.

**25 findings — 3 High, 10 Medium, 12 Low.** The pattern: the contact form fails silently or
with one generic sentence, legal links lead nowhere, and failures across the site are blamed on
the connection or shown twice.

## Findings

| # | Theme | Page | What the visitor saw | Rule | Sev |
|---|---|---|---|---|---|
| V01 | all | Contact form | Name and message of spaces: Send does nothing — no request, no message. | silent failure | High |
| V02 | all | Contact form › 400, 429, 500, abort | Always "Something went wrong. Please try again."; the 400 marks no field, the 429 doesn't say wait; focus drops to the page. | V5/V2 | Medium |
| V03 | all | Contact form › validation | Only the browser's bubble (English on Arabic pages); "mona@example" sent; name cut to 200 and message to 5,000 silently, then "Message sent"; no counter; Modern Education has no required note. | V1/V2/V7/V12 | Medium |
| V04 | all | Course detail | Every real course opens the theme's 404: the seeded sites have no published course-details page (`ensureCorePages` adds it when published from the dashboard). | stuck | High |
| V05 | all | Sign-up consent, legal | "I agree to the Terms and Privacy Policy" is plain text; no legal links in footers; the cookie dialog's Privacy link is a 404 on academy hosts. | legal | High |
| V06 | all | Cookie preferences | Atlas dashboard copy on the academy's site ("Atlas uses no advertising…", "sidebar layout"). | white label | Medium |
| V07 | all | Server errors | Catalog 500 "check your connection" (Riwaq right) plus a toast; whole site down with no Try again; interest form 500 blamed on the connection; enrolment shown twice; 403 "try again" beside the real reason. | V5 | Medium |
| V08 | all | Enrol when already enrolled | "We couldn't enroll you… try again", no "you're already enrolled", no Continue. | V5 | Medium |
| V09 | all | Reset password link | A server fault reads "This reset link is invalid or has expired". | V5 | Medium |
| V10 | all | Page titles | Every page titled with the academy name only; error states titled "Atlas". | SEO | Medium |
| V11 | Modern Education, Atelier, Manara | Phones | A long category chip makes the page 591 px wide (Modern Education); Atelier home AR-375 scrolls sideways 14 px; Manara cuts the chip. | overflow | Medium |
| V12 | Atelier | Phone menu | Sign Up and Sign in run past the screen edge. | layout | Medium |
| V13 | all | Phone course page | Header, purchase bar and bottom nav take 190–206 px of 812; the bar covers the footer's last line. | layout | Low |
| V14 | Atelier, Manara | Phone header | Academy name cut ("Web Developmen…"). | identity | Low |
| V15 | all | Broken images | The browser's broken-image icon; no fallback to the theme's course image. | degrade | Low |
| V16 | all | Toast at AR-375 | Starts 16 px off the edge and covers the header. | RTL | Low |
| V17 | Atelier | Home | Step numerals 1.51:1. | contrast | Low |
| V18 | all | Keyboard | Cookie banner buttons come after the whole page; Modern Education's menu opens on "العربية". | a11y | Low |
| V19 | all | Headings | Heading-order errors on reset, verify email, Google return, certificate; no h1 on the course error. | a11y | Low |
| V20 | all | Layout shift | Custom sections 0.43–0.79, Offers 0.31–0.61 (dev server, no SSR). | perf | Low |
| V21 | all | Blank loads | About 6 of ~1,400 loads stayed blank for 15 s; the first language switch on account pages showed a skeleton or white page (dev server). | quality | Low |
| V22 | all | Contact page | "Reach us directly using our contact details" with no details to show. | copy | Low |
| V23 | all | Suspended academy | Looks like a wrong address; tab title "Atlas". | clarity | Low |
| V24 | all | Course, enrolled | "Submit review" offered before any lesson is opened. | clarity | Low |
| V25 | all | Arabic digits | Mixed numerals on one page (same root cause as B7 V18). | V12 | Low |

## Per theme
- **Modern Education** — clean, consistent, correct RTL mirroring, good keyboard support; page-wide
  overflow from a long chip, no required note on contact, menu's first focus.
- **Atelier** — the most distinctive; scroll scenes work and fall back cleanly with reduced motion;
  phone menu buttons overflow, sideways scroll on the Arabic phone home, low-contrast numerals.
- **Manara** — bold, no page overflow, long titles wrap; chip cut on phones, errors blamed on the
  connection.
- **Riwaq** — calm; the only catalog error that says the problem is on the site's side.

## Works well — keep
- Account forms: inline errors, a focused summary, specific 429/500 with a reference, Arabic copy,
  the "you already have an Atlas account" path on 409.
- Interest form: fields marked, phone checked by country, violations on their fields, clear 429.
- Mobile menu in every theme traps focus, closes on Escape, returns focus, locks scrolling.
- Skip link, visible focus rings, reduced motion honoured (0 animations).
- The language switch keeps the page and the query; catalog state lives in the URL.
- 404, Coming Soon and certificate verification states; double submit blocked; honeypot works.

## Not tested, with reason
- Moved-address redirect (off in development); no separate maintenance state.
- Blog, pricing, instructors and legal page types don't exist in the router (pricing and
  instructors exist as sections and were tested).
- Real enrolment, purchase and checkout (B7); preview lesson playback (mocked ids); a real Google
  return; catalog filters at AR-375 (inside a sheet); dark mode (academy host is always light).

The visual design of the themes is in B10.

## Fixes

### Shared root causes
- **One contact form (V01–V03)** — the five contact renderers (four themes and the generic
  section) share one hook and rules (`sections/contact/`): spaces count as empty, the email is
  checked as the API checks it, nothing is cut (counters, refusal past 200 / 320 / 5,000), "All
  fields are required" in every theme, messages in the page's language (`noValidate`), a 400 on
  its field, a 429 that says how many minutes to wait (Retry-After), a 500 that blames the
  academy's side with a reference and Try again, a network failure that names the connection;
  focus goes to the problem and the typed text is kept. Plain state, no extra library on every
  academy page (the theme packs stay inside their size budgets).
- **The right cause, once (V07–V09)** — only a network or timeout failure mentions the
  connection; the public read hooks mark their errors inline, so no second toast; one enrolment
  failure component in every theme.
- **Legal (V05, V06)** — Terms, Privacy and Cookie Preferences in every theme's footer; the
  sign-up consent and the cookie dialog link the platform's legal pages absolutely, in a new tab;
  the cookie dialog on an academy host names the academy and doesn't mention the dashboard.

### Per finding
- **V04** `/courses/:id` falls back to a built-in Course Details page when the published pages
  have none (a page created after publishing, or hidden).
- **V08** "You're already enrolled" with Continue to the course; a 403 shows only the real reason.
- **V09** A failed reset-link check says the check failed, with Try again; "invalid or expired"
  only when the API says so.
- **V10** Titles "Page · Academy" in the visitor's language (Home: the academy name); "Page not
  found" and status pages titled by their state.
- **V11 / V12** Long chips wrap in their chip; Atelier's hero search no longer widens the page
  (which also pushed its phone menu off-screen).
- **V13** With a purchase bar on phones, the footer gets bottom padding in its own colour.
- **V14** Atelier and Manara phone headers fit the academy name.
- **V15** A broken image shows the theme's course fallback instead of the broken-image icon.
- **V16** Toasts stay inside the phone margins in both directions.
- **V17** Atelier's upcoming step numerals at least 3:1.
- **V18** The cookie banner comes first in tab order; Modern Education's menu opens on its
  first link.
- **V19** Heading order fixed on reset, verify email, Google return and certificates; course
  error states have an h1.
- **V20** A section still loading keeps its space.
- **V22** The sentence about contact details shows only when there are details.
- **V23** The not-found copy fits a suspended academy too ("no website available at this
  address… try again later"); no "Atlas" tab title.
- **V24** "Submit review" appears once the course is started; before, a one-line note.

### Not changed, with reason
- **V21** The white flash is a deliberate full reload on the auth pages' language switch; production
  serves the page from the server.
- **V23** The API answers a suspended academy and a wrong address the same way on purpose (billing is
  never disclosed), so they can't be told apart.
- **V25** Mixed digit styles — decided and fixed: Western digits (0–9) everywhere in Arabic, themes included.
- The visual design of the themes is B10.

