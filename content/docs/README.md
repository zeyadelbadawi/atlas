# Atlas Help Center content

The help center on `docs.<base>` (DL-57) is built from the Markdown files in
this folder by `pnpm build:docs` (`src/docs/`, `scripts/docs/prerender.mjs`).
Every article exists in English **and** Arabic; the build fails if a pair is
missing, a link or screenshot is broken, or a rule below is broken
(`src/docs/content/validate.ts`).

```
content/docs/
  en/<category>/<slug>.md     English article (URL /<category>/<slug>)
  ar/<category>/<slug>.md     Arabic article  (URL /ar/<category>/<slug>)
  en/<category>/_index.md     optional intro for a category page
  shots/<category>.yaml       how each screenshot is captured (both languages)
  media/<lang>/<category>/    captured screenshots (WebP) + manifest.json
```

Slugs are lowercase ASCII with hyphens and **identical in both languages**.
The category folder must be a category id from `src/docs/categories.ts`.

## Front matter

```yaml
---
id: DOC-COM-002            # same id in en and ar (page inventory id)
title: Set up payment methods
description: Add bank transfer, e-wallet or InstaPay details so learners can pay. (≤ 160 chars, meta description)
summary: >                 # 40–60 words; the answer shown under the title, in search and in llms.txt
  The organization owner adds bank, e-wallet or InstaPay details per academy
  and turns each method on. Learners see exactly these details at checkout.
type: step-by-step         # step-by-step | setup-config | feature-explanation | workflow | role-guide |
                           # troubleshooting | faq | reference | glossary | security-privacy | integration |
                           # changelog | hub
audience: [owner]          # owner | manager | instructor | learner | everyone
order: 2                   # position inside the category
priority: P0               # P0 | P1 | P2
related: [DOC-COM-001, DOC-COM-010]
keywords: [instapay, vodafone cash, wallet]   # extra search words (any language)
updated: 2026-10-20
---
```

## Body

Standard Markdown. Headings start at `##` (the title is the `h1`).

**Steps** are an ordered list. Each item is one action. Quote the exact label
the app shows, in bold, in the article's language. Put the step's screenshot
inside the item, indented, as an image with the `shot:` scheme:

```markdown
1. In the academy sidebar, open **Payment methods**.

   ![The Payment methods page with three method cards](shot:selling/payment-methods)

2. On the method card, choose **Set up**.

   ![The set-up dialog for InstaPay](shot:selling/payment-methods-setup-dialog)
```

Every numbered step in a how-to article has a screenshot. The alt text says
what the screenshot shows, in the article's language.

**Callouts** (GitHub style):

```markdown
> [!NOTE]
> Learners see the details exactly as you type them.

> [!LIMITATION]
> Atlas does not check that a transfer arrived. You confirm it in your bank or wallet app.

> [!WARNING]
> Turning a method off hides it from checkout immediately.

> [!TIP]
> Add the Arabic instructions too: Arabic-language learners see them.
```

**Links**

| Write | Becomes |
|---|---|
| `[Review payment proofs](doc:DOC-COM-003)` | the article in the same language |
| `[Sign in](app:/auth/sign-in)` | the Atlas app (absolute URL) |
| `[Pricing](site:/pricing)` | the marketing site, same language |

**Catalog tokens**: `{trialDays}` (number of trial days) and
`{trialDuration}` ("14 days" / «١٤ يومًا») come from the live plan catalog
at build time. Never type a trial length, a price or a limit by hand.

## Writing rules

- Write from the code: real routes, real labels (the locale files in
  `src/localization/resources/{en,ar}`), roles that are really allowed,
  limits from the catalog. If the app does something unexpected, describe
  what it does.
- Arabic is simple Arabic with an Egyptian, friendly tone («افتح»، «اضغط
  على»، «هتلاقي»), written for the reader, never translated word for word.
  UI labels are quoted exactly as the Arabic interface shows them.
- English is plain and direct ("Open", "Choose"), second person.
- Protection features say what they do **and what they do not do**
  (`> [!LIMITATION]`). No claim beyond what is verified.
- Never mention Premium plans, a price in USD, "free" / «مجاني», "100%",
  "unlimited" (unless the catalog says so for that limit), or features that
  are switched off (hosted video, text lessons, live classes, the academy
  blog and forum, add-ons, Atlas Payments).
- Screenshots use demo data only: no real person, number or account; no
  testimonials, reviews or student counts on screen.

## Screenshots

`shots/<category>.yaml` lists every `shot:` key used by that category's
articles. `pnpm docs:capture` (`scripts/docs/capture.mjs`) signs in to a
local stack seeded with demo data and captures each one in English and
Arabic. See `scripts/docs/README.md`.

```yaml
- key: selling/payment-methods
  as: owner                  # owner | manager | instructor | learner | visitor
  surface: dashboard         # dashboard | academy (the demo academy's site) | platform (signed-out pages)
  path: /dashboard/academy/{academyId}/payment-methods
  viewport: desktop          # desktop (1440x900) | mobile (390x844)
  waitFor: { text: payments:academyMethods.title }
  actions:                   # optional, run in order before the capture
    - click: { role: button, name: payments:academyMethods.setUp, nth: 0 }
  highlight: { role: button, name: payments:academyMethods.setUp, nth: 0 }
  clip: dialog               # optional: capture only this element (CSS selector or "dialog")
```

`name` and `text` take an i18n key (`namespace:key.path`), resolved in the
capture language, or a literal `{ en: "...", ar: "..." }`.
