# Dashboard RTL quality + slug suggestion UX (P55/P56)

**Status: IMPLEMENTED, TESTED, VERIFIED IN REAL CHROME at 390 / 768 / 1440 in
both languages.**

---

# Part 1 — Slug suggestion (P55)

## 1.1 What the audit actually found

The handover described this task as "Academy **slogan** suggestions". The
repository does not support that reading:

- `grep -rli 'slogan\|tagline'` over both repos returns **no** field, DTO,
  schema column, validation rule or translation key. The `Academy` model has
  `name`, `slug`, `description` — no slogan.
- What *does* exist is two places where a user types a human title and then has
  to hand-write a URL identifier directly beneath it:
  - **Academy provisioning** — `academyName` → `requestedSubdomain`
  - **Course creation** — `title` → `slug`

Both match the brief's own worked example ("ABC Academy" → `abc-academy`), and
both already had authoritative validation. So the implemented target is **slug
suggestions for Academy provisioning and Course creation**. The conclusion and
its evidence are recorded here rather than in a commit message because the
handover's wording will outlive this batch.

## 1.2 Generation

One generator, `slugifyTitle` (`shared/utils/string.utils.ts`), shared by both
call sites so they cannot drift. It **proposes; it never approves** — the zod
schema, the backend DTO and the uniqueness constraint all still run. Each
form keeps its own existing validation untouched.

Non-Latin input yields `''` — deliberately, and no suggestion is written:

- A subdomain is a DNS label and a course slug appears in a URL; both are
  ASCII by definition.
- Transliterating Arabic would mean inventing a romanization scheme, and a
  wrong one silently becomes a customer's permanent public address.
- A mixed title still suggests the part the user actually wrote
  (`أكاديمية ABC` → `abc`).

`maxLength` truncates and then re-trims separators, so truncation can never
leave a trailing hyphen — which would fail the very regex this exists to
satisfy.

## 1.3 Generated vs user-customized — the rule that matters

`useSlugSuggestion` (`shared/hooks`) keeps the slug tracking the title **until
the user edits the slug themselves**, then never proposes again.

- **"Touched" is a latch, not a value comparison.** Comparing the field to
  `slugifyTitle(title)` looks equivalent and is not: a user who edits the slug
  and later happens to change the title to the matching one would have their
  edit silently reclaimed.
- **The latch is a ref, not state.** React batches updates, so a title change
  landing in the same tick as the first slug keystroke would read a stale
  "not customized" and overwrite the edit — the precise bug this prevents.
- **Clearing the field is an edit too**, so the next keystroke in the title
  does not refill a field the user just emptied.
- The help text tells the truth about which mode the field is in
  (`…Suggested from your Academy name` vs the plain help line).

## 1.4 Uniqueness

- **Academy subdomain** reuses the existing `GET /subdomains/availability`
  through the existing debounced `useCheckSubdomainAvailability`. A suggestion
  is checked exactly as a typed value is; there is no separate path.
- **Course slug**: no availability API was invented. Uniqueness is
  `@@unique([academyId, slug])`, surfaced as a real 409
  (`errors.course.slugTaken`) that the form already reports — and unlike a
  subdomain (globally unique, allocated before provisioning runs), a colliding
  course slug is an ordinary recoverable error at submit, not a wasted
  onboarding. A second uniqueness opinion the database would overrule anyway
  is not worth an endpoint.

Both slug inputs carry `dir="ltr"`: an ASCII identifier must read
left-to-right even on an Arabic page, or the caret and hyphens sit on the
wrong side of what is being typed.

## 1.5 Not applied to edit forms

Course **edit** and Academy **settings** deliberately do not suggest: those
slugs already exist and are part of a live public URL, so following a title
edit would silently break links.

---

# Part 2 — Dashboard RTL (P56)

## 2.1 Root cause

Atlas's direction architecture is sound: `LocalizationProvider` sets
`document.documentElement.dir`, so every component inherits direction and no
component needs a direction branch. Atlas-authored shared components are
RTL-correct — `Breadcrumbs` and `Pagination` already mirrored their chevrons.

The defects were one layer below: the **vendored shadcn primitives in
`src/components/ui/`** were never adapted, and still used *physical* CSS
properties. Because every dashboard page composes those primitives, one wrong
class showed up on dozens of screens — and a previous session had worked
around exactly one instance locally (`PublicLayout` overriding `SheetHeader`'s
`sm:text-left`) instead of fixing the primitive, leaving every other consumer
broken. That local override is now removed, because the primitive is fixed.

## 2.2 Shared primitives fixed (logical properties)

| File | Was | Now | Symptom it caused |
|---|---|---|---|
| `table.tsx` | `text-left`, `pr-0` | `text-start`, `pe-0` | **every table header left-aligned in Arabic** while its cells sat right |
| `dialog.tsx` | close `right-4`, `sm:text-left`, `sm:space-x-2` | `end-4`, `sm:text-start`, `gap-2` | close button overlapped the RTL title; footer buttons unspaced |
| `sheet.tsx` | same three | same three | drawer header mis-aligned |
| `alert-dialog.tsx` | `sm:text-left`, `sm:space-x-2` | `sm:text-start`, `gap-2` | |
| `alert.tsx` | icon `left-4`, text `pl-7` | `start-4`, `ps-7` | icon pinned left while text indented from the left too — overlapping |
| `dropdown-menu.tsx` | `pl-8 pr-2`, indicator `left-2`, `ml-auto` | `ps-8 pe-2`, `start-2`, `ms-auto` | check indicator on the wrong side; submenu chevron unmirrored |
| `select.tsx` | `pl-8 pr-2`, indicator `left-2` | `ps-8 pe-2`, `start-2` | selected-item tick on the wrong side |
| `toast.tsx` | `pr-8`, close `right-2` | `pe-8`, `end-2` | close button over the start of Arabic text |

`space-x-*` was replaced with `gap` where it mattered: it sets `margin-left` on
children and does **not** flip, while `gap` is direction-agnostic and
identical in LTR.

**Deliberately left physical**, because they are not direction:
`dialog`'s `left-[50%]` + `translate-x-[-50%]` (horizontal centring);
Radix `data-[side=left]:slide-in-from-right-2` (animation tokens matching
Radix's own computed side); `sheet`'s `left`/`right` variants (a semantic
`side` prop the app already sets as `isRtl ? 'right' : 'left'`); the toast
viewport position (moving it without the hardcoded swipe-dismiss direction
would make the dismiss animation fly the wrong way — a worse defect than the
convention it would fix).

## 2.3 Directional icons — one convention, named

Roughly half the dashboard's directional icons shipped unmirrored (a "next"
chevron pointing away from where it takes you), and one area had independently
invented `rtl:rotate-180` for the same job.

`MIRROR_IN_RTL` (`shared/utils/bidi.utils.ts`, beside
`isolateNumericExpression`) names the convention once, so the correct thing is
greppable and reviewable.

**Mirror, not rotate.** For a chevron the two look identical, which is why the
second convention went unnoticed — but a Send paper-plane points
up-and-forward, so mirroring gives up-and-forward the other way while a 180°
rotation points it **down-and-backward**. (The unmirrored Send arrow on the
support reply button is what surfaced this, in Chrome.)

Applied to: tenant-dashboard chevrons ×3, course-create arrow, academy
onboarding arrow, billing overview arrows ×2, support Send ×2 (customer and
agent), search-result chevron (whose `translate-x-0.5` selection nudge also
now follows the reading direction), student course-details arrow.
`rtl:rotate-180` normalized to the shared class in platform-zoom ×3, plan
change summary, website blog tab ×2.

**Not applied** to icons that merely contain an asymmetry — magnifier, pencil,
logout door, external-link box — mirroring those makes them look broken.

## 2.4 Raw translation keys — a systematic sweep

Real-Chrome inspection turned up raw keys on screen (`common.limits.recordedSessions`
on Plans, `detail.assignedTo`/`detail.unassigned` on the agent ticket page,
`actions.loading` on the sign-in button). Rather than fix them one screen at a
time, every literal `t('ns:key')` in `src/` was cross-checked against both
bundles.

**2602 literal keys checked. 20 were missing from EN and AR alike; all are now
resolved, and EN/AR are at parity.**

The largest single finding: `t('errors:generic')` in **22 files**.
`errors:generic` is an **object** (`{title, description}`), so i18next returned
a diagnostic string — a broken message on nearly every error toast in the
dashboard. The previous QA pass documented this exact trap; the call sites had
never been swept. All now use `errors:generic.description`.

Where a suitable key already existed, the **call site** was pointed at it
rather than a duplicate string being added (`settings:page.*`/`tabs.*` →
`settings:title`/`subtitle`/`<section>.title`; `common:pagination.previous`/
`next`/`pageOf` → the existing `previousPage`/`nextPage`/`page`).

`common:unsavedChanges` is an object consumed by `NavigationBlockDialog`;
two call sites were using it as a string and now use `.description`.

## 2.5 Verification

Real Chrome, local stack (real Postgres with RLS, real object storage).
Window resizing is blocked in this environment (fullscreen), so responsive
checks ran in a **same-origin iframe** sized to each width — media queries
evaluate against the iframe's viewport, so the real breakpoints are exercised.

Pages: Dashboard home, Plans, Academy provisioning, Support (list + ticket +
agent view), Add-ons, Courses.
Widths: **390 / 768 / 1440**. Languages: **AR/RTL and EN/LTR**.

Every combination: `dir`/`lang` correct, **no page-level horizontal overflow**,
**no element wider than the viewport**, **no raw translation keys**, no console
errors.
