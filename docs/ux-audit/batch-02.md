# B2 — Academy website builder (Nov 2026)

Pages: website overview, pages, page editor and section forms, visual editor, content (FAQ,
testimonials), settings (theme, SEO, menu/header/footer, domain, language), preview, messages,
visual identity. Local stack, owner account, EN/AR × light/dark × 375/1280. Every form
submitted wrong on purpose; 400 (with violations), 409 (stale version), 500 and network abort
forced; real backend 400s produced by tampering requests. 217 screenshots.

**34 findings — 12 High, 13 Medium, 9 Low.** The main pattern: what the server rejected rarely
reached the field; the customer often read the wrong reason ("Unexpected error", "undefined",
`{{count}}`, "changed by someone else" when nobody was); several dialogs threw typed work away
on Escape.

## Findings

| # | Page | What the customer saw | Rule | Sev |
|---|---|---|---|---|
| V01 | Page editor › Add section | The menu is 1075 px tall with overflow hidden; at 1280×900 it starts above the screen, at 375 21 items are below it; the wheel does not scroll it. | overflow | High |
| V02 | Page editor header | EN: the title reads "Hor", the subtitle wraps one word per line. AR: "نشر الصفحة" cut off and the page scrolls sideways. | overflow, RTL | High |
| V03 | Settings › SEO; page "Edit SEO" | The word **"undefined"** in red under Meta title and Meta description; no limit, no counter. | V2/V7 | High |
| V04 | Settings › SEO › Canonical base URL | "not a url", "example.com", "ftp://…", "https://" all saved with "SEO settings saved". A canonical *path* is told "Enter a valid URL". | V7 | High |
| V05 | Settings › Menu (autosave) | Empty menu label: only "Failed to save navigation"; the field is not marked. An 80-character label saves. | V2/V5/V7 | High |
| V06 | Settings › Menu (autosave) | Two quick edits → the second save conflicts with the first: "This content was changed by someone else while you were editing." The edit is lost. | V5, data loss | High |
| V07 | Visual identity › colour fields | "zzz", "#12345", "red": no message, the swatch stays, the bar says "Everything is saved and live." and Save is greyed with no reason. | V2/V4 | High |
| V08 | Visual identity › Save | 500/abort: ~12 s of nothing, then two toasts. 409: two contradictory toasts. 400 on name: generic toast, name not marked. | V5 | High |
| V09 | New page / New FAQ dialogs | "Unexpected error"; the real reason ("That address is reserved…") is in a toast under the modal overlay. | V2/V5 | High |
| V10 | New FAQ | Server 400: "En must be {{count}} characters or fewer" / "يجب ألّا يزيد En عن {{count}} أحرف". | V2/V12 | High |
| V11 | Section, New page, New FAQ dialogs | Escape or × closes and discards typed edits without asking. | V10 | High |
| V12 | Settings › Theme; Visual identity previews | 136 focusable elements inside preview thumbnails; five `h1` on one page. | a11y | High |
| V13 | Visual editor autosave | "Couldn't save your changes" for every failure, no reason; at 375 only an icon. | V5/V6 | Medium |
| V14 | Visual editor › leave | The leave dialog closes itself when autosave fires; the change is saved although "Leave and discard" was never chosen. | V10 | Medium |
| V15 | Page editor › Save draft | "These sections need attention before this page can be saved: ." — an empty list. | V3/V5 | Medium |
| V16 | Page editor › Save draft | 500/abort: inline card and a toast with the same text; the toast covers Publish. | V5 | Medium |
| V17 | Messages; custom domain | Two toasts for one failure; a domain already connected is not marked on the field. | V5 | Medium |
| V18 | Section form copy | Freshly typed over-limit text: "Your website still shows it…"; the panel says "before applying" with no Apply button. | copy | Medium |
| V19 | Required markers | Required default-language fields unmarked; FAQ requires Arabic on an English site; an empty slug gets two messages. | V1/V2 | Medium |
| V20 | Section buttons › External URL | "Enter a valid URL" with no hint; an empty URL accepted, preview still shows the button. | V2/V7 | Medium |
| V21 | Image fields | "The file is too large." (limit never stated); hint and error list different formats; a corrupt PNG gets two contradictory messages. | V8/V5 | Medium |
| V22 | Messages filters | "From" after "To": no message, everything still listed. | V7 | Medium |
| V23 | Load failures | About 40 s of skeleton before the error (18 requests). | silent wait | Medium |
| V24 | Every website page | Opening the area recreates a `course-details` draft, so every bar says "1 page has unpublished changes" though nothing was edited. | clarity | Medium |
| V25 | Publish buttons | Greyed with no reason; at 375 the visual-editor Publish has no accessible name. | V4/a11y | Medium |
| V26 | Visual identity palette | "Decorative only" label 3.00:1 contrast. | contrast | Low |
| V27 | Messages at 375 | Status tabs overflow ("Archived" cut off); placeholder "Search by nam"; Arabic preview cut at the start. | overflow/RTL | Low |
| V28 | Image previews | Social image preview collapses to a 14 px strip; dark logo preview is a black pill. | polish | Low |
| V29 | Settings › Theme | "Select theme" switches immediately with no note that it goes live on publish. | V9 | Low |
| V30 | Delete section | "This cannot be undone." — it is a draft change with Undo. | copy | Low |
| V31 | Visual editor header | Status text truncated; "double-click" tip on touch; 36 px targets at 375. | polish | Low |
| V32 | Section image field | The theme's stock photo sometimes shows "Preview unavailable". Intermittent. | polish | Low |
| V33 | Toasts | Two toasters (bottom-right legacy and top sonner); the legacy one covers the sticky Save bar. | consistency | Low |
| V34 | Arabic pages | The content-language select reads "English"; page names "Home" in English. | V12 | Low |

## Works well — keep

- Section-form client checks: message under the field with a counter, "Shorten to 70 characters
  or fewer", the summary names the field, focus to the first bad field, fully translated.
- A real server 400 on a page save maps to its sections ("Edit 1. Hero / Edit 2. Features").
- The stale-version dialog ("Omar Hassan saved a newer version…", Keep mine / Reload latest).
- "Leave without saving?" on the classic editor, Visual identity and the SEO tab.
- Confirmations for deleting a section, taking the site offline, publishing sample content.
- Phone, WhatsApp, custom domain and upload-type messages that name the expected format.
- Visual-editor keyboard access; RTL mirroring; dark-mode contrast.

## Fixes

### Shared root causes (whole dashboard)
- **One retry layer (V08, V23; B1's open item; B3 V17)** — reads are retried only by the query
  layer; the HTTP client retries a replay-safe write once, and only for a gateway or restart
  failure (no response, 502–504). A failed list used to take 18 requests and ~40 s before its
  error, a failed save ~12 s.
- **One toaster (V33)** — the legacy `toast()` (54 call sites) renders through the app's sonner
  toaster below the header; nothing opens in the bottom corner over sticky save bars.
- **`FormMessage` (V03)** — an object field (`{ en, ar }`) shows its first nested message, never
  the word "undefined"; only key-shaped strings are treated as translation keys, so a server
  reason containing a colon is never rendered blank.
- **Unfilled placeholders (V10)** — the backend's Zod violations now carry their `count`; the
  dashboard never shows `{{count}}` (falls back to the generic field message), a server field
  label drops the language/index segments ("En must be…" is gone) and a non-English page says
  "this field" rather than the API's English name.
- **`aspect-video` / `aspect-square` / `aspect-auto` (V28)** — `@tailwindcss/aspect-ratio`
  replaced the theme's scale, so ~30 boxes across the app had no shape (a social-image preview
  22 px tall). The three names are restored in `tailwind.config.ts`.
- **Warning colour contrast (V26)** — light-mode `--warning` 44 % → 32 % lightness: 5.3:1 on
  white, 4.9:1 on the warning surface (was 3.0:1; used as text in 68 places).
- **Audit-log email scrub (backend, found by B3 V01)** — linear time: a long string no longer
  freezes the API.

### Settings, visual identity, messages, domain (mine)
- **V03** SEO: per-language limits with counters and "Shorten to N"; server `metaTitle.en`
  violations under that language; a failure is one inline "Your changes weren't saved" with the
  real reason — no toast (both the website SEO tab and the page "Edit SEO" dialog).
- **V04** Canonical base URL must be a full `http(s)://host` address ("Enter the full address,
  starting with https://…"); a canonical *path* is told to start with `/`.
- **V05** Menu and header-button labels: empty in the site's language, or longer than 40, is
  stopped on the field with its message (counter shown); server label violations land on the
  item's field.
- **V06** Menu/header/footer saves run one at a time, each built from the latest saved copy —
  two quick edits by one person no longer conflict.
- **V07** Colour hex fields say "Enter a colour as a hex code: # and 6 characters, like
  #1B3A8C" and keep the last good colour.
- **V08** Visual identity: one toast with the reason (the reporter's second toast is gone); a
  refused name shows on the name field with focus.
- **V17** Messages status change and custom-domain connect: one toast; a taken, reserved or
  invalid domain shows on the domain field with focus.
- **V21** Image fields state the size and the limit ("This image is 16 MB; the limit is 5 MB");
  a refused type names the types this field accepts; other failures give the real reason; no
  extra toast listing GIF/PDF.
- **V22** A reversed date range says so, with "Swap dates".
- **V27** Messages: status tabs wrap at 375 px; the search keeps room for its placeholder; the
  message column no longer pushes the table past the card.
- **V29** Choosing a theme confirms it changed the draft and goes live on publish.

### Not changed, with reason
- **V12** previews are `inert` and `aria-hidden`: 200 Tab presses never entered them and
  assistive tech sees one `h1`. The audit counted DOM elements, not reachable ones.
- **V24** the `course-details` draft appeared because the audit deleted that row; every site
  creates its core pages at setup. Naming the pages behind "1 page has unpublished changes" is
  noted for a later pass.
- **V32** intermittent "Preview unavailable" for a theme photo — not reproduced.
