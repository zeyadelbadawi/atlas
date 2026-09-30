# Themes 2–5 retirement — usage report, migration plan, rollback, verification (30 Sep 2026)

Target: Theme 1 (`modern-education`) is the only selectable theme; future themes are added through the ThemePack architecture. Themes 2–5 (`premium-academy`, `corporate-learning`, `minimal-editorial`, `bold-creative`) are retired **safely**:

1. usage scan;
2. migration to Theme 1;
3. verify;
4. retire from selection;
5. delete, only after the production migration is verified.

This change covers steps 1–4 in code and tooling. **No production data was read or changed**: this session has no production access, and no production result below is invented.

## 1. Dependency and usage scan

**Where a theme key lives.** No SQL constraint, enum, function or seed names any of the four keys.

- `website_configurations.theme_key`: TEXT NOT NULL. The website's theme. The public lookup (`resolve_public_presentation`) returns it raw.
- `website_configurations.template_key` / `template_version`: which template first generated the pages (provenance).
- `provisioning_requests.selected_theme_key`: TEXT. The theme a provisioning request picked. Its theme step applies it.

**Enforcement points**, each derived from one `WEBSITE_THEME_KEYS` array per repo:

| Where | What |
|---|---|
| Backend `UpdateWebsiteConfigurationDto` (`PATCH …/website/configuration`) | `@IsIn` theme key |
| Backend `CreateProvisioningRequestDto` | `@IsIn` selected theme key |
| Backend `ProvisioningOrchestratorService.executeThemeStep` | applies the key, generates the website |
| Backend `website-template.registry.ts` + 4 template files + `shared-support-pages.template.ts` | starter content per theme |
| Frontend `website-theme.registry.ts` (`listWebsiteThemes`) | the Theme tab gallery and the provisioning picker |
| Frontend `theme-pack.registry.ts` | Themes 2–5 use the base pack (base renderers, base brand mapping) |
| Frontend `WebsiteSystemPages.tsx` | Theme 1 draws its own 404/Coming Soon; Themes 2–5 use the shared ones |

The full file-by-file sweep, including tests, fixtures, baselines and docs, is kept in this session's notes. Its conclusions are the table above and §4.

**Rendering compatibility.** Theme 1's pack draws **all 16 section types itself** (`website-theme.registry.test.ts` asserts it), and every section config is validated by one theme-agnostic schema. So no section type a Themes 2–5 website can hold is unmappable. Header, footer, navigation, SEO and brand are theme-agnostic too: they have no variant fields.

**What changes visually for a moved website:**
- The theme's look (typography, spacing, hero and chrome layout), by design.
- **Empty sections stop showing a bare heading.** Theme 1 applies the honest-public-site rules (plan §D.4): testimonials without a real quote, a gallery without images, statistics with fewer than two real values, and instructors when there are none are not drawn on the public site. Themes 2–5 drew such a section's title over nothing.
  - The section, its title and settings stay stored, and the section appears as soon as it has content. The editor still shows it.
  - The dry run lists every such testimonials and gallery section (`hiddenUntilContent`) so the Owner sees them before the move. Statistics and instructors depend on live data, which a dry run can't know.

These points apply to every moved website:
- Brand colours are always stored (`primaryColor`/`secondaryColor`/`accentColor` are schema-required), so they don't fall back to a theme default.
- The stored palette and logos are untouched.

**How to get the production counts.** Run the dry run (§2) against production. It prints and saves exactly what this report needs:
- the websites per theme;
- each website's academy, organisation, status, pages and sections by type, colours, palette and logo presence, and any unmappable section;
- a content fingerprint per website;
- any in-flight provisioning request on a retired theme.

Nothing in this report replaces that output.

## 2. Migration (tooling: `atlas-backend/scripts/retire-website-themes.ts`)

**What it writes, per website, and nothing else:** `theme_key → 'modern-education'` and `config_version + 1`. The version bump keys the public cache, so the live site picks up the change.

It does not touch:
- pages or sections;
- brand colours, palette or logos;
- navigation, header, footer or SEO;
- publish status;
- template provenance (`template_key` still records which template made the pages).

**Deterministic, gated and idempotent:**

```
# 1. Dry run (read-only): the report to review
npm run db:retire-website-themes -- --out=plan.json

# 2. Apply exactly the reviewed plan
npm run db:retire-website-themes -- --apply --plan=plan.json --out=applied.json

# 3. Rollback (dry run unless --apply)
npm run db:retire-website-themes -- --rollback=applied.json [--apply] --out=rolled-back.json
```

- `--apply` refuses to run without a reviewed dry-run report.
- A website is moved only if it is still on the planned theme with the planned content fingerprint. Anything edited since the dry run is skipped and listed (`skippedChangedSincePlan`). Re-running is a no-op (`alreadyDone`).
- A website with an unmappable section (an unknown type or malformed data) is never moved (`skippedUnmappableSections`); the section is listed for a person to resolve.
- Each move is its own transaction. The fingerprint is re-computed after the write and the transaction rolls back on any difference.
- Writes go through the Academy's own active owner in tenant context (RLS `is_academy_member`), never an RLS bypass. The cross-tenant listing runs as the Platform Owner (`*_platform_select`), as `backfill-nav-footer-ar-labels.ts` already does.

**Rollback:** restores each moved website's previous key, but only where the website is still on Theme 1 with the same content. An Owner edit made after the move is listed, not overwritten.
- Data rollback alone is enough while the retired themes' code is still present. It is, until step 5.
- After step 5 (deletion), rolling back also needs that code restored.

**In-flight provisioning requests** that picked a retired theme before the release get Theme 1 at their theme step (`selectableWebsiteThemeKey`). The dry run lists them.

## 3. Verification before any deletion

Local, on a copy of the dev database (the migration is not run against production):

| Check | Result |
|---|---|
| Dry run: 7 academies; 4 retired + 1 unknown key → 5 to move; 1 flagged unmappable (an injected `carousel` section); 0 without stored colours | ✅ |
| `--apply` without a plan | refused ✅ |
| Apply: 3 moved; 1 skipped (Owner edited the brand after the dry run); 1 skipped (unmappable section) | ✅ |
| Every page (sections, SEO, visibility, version) and every configuration (brand, SEO, navigation, header, footer, status, template key) byte-identical before and after (md5 over all rows) | ✅ |
| Apply again: 0 moved, 3 `alreadyDone` | idempotent ✅ |
| Rollback dry run → apply → again: 2 restored; 1 skipped (content edited after the move); then 2 `alreadyDone` | ✅ |
| Unit tests: plan, fingerprint (key order, content changes), summary, provisioning mapping | ✅ |

Rendering, in the browser (`e2e/theme-baseline/theme-retirement.spec.ts`). Each retired theme's real generated website is rendered as it is today, then as the migration leaves it: same pages, sections and brand, theme key set to Theme 1 (the fixture server's `migrated` slug). The spec covers 4 themes × new/rich states × every public page × EN/AR × 1440/390 and checks each case for:

- rendering through Theme 1's pack;
- no page errors, unmocked calls or CSP violations;
- no horizontal overflow;
- `dir` correct;
- **no Owner-authored text that the current theme shows is missing after the move**, except the headings of sections in their "nothing to show yet" state, whose four rules the spec encodes explicitly;
- no serious or critical axe violation.

Before/after screenshots are attached to the run for review.

**Result: 160/160.** The first run failed 20 Home cases on exactly those empty-section headings (for example Premium's empty "In Their Words" testimonials, or Corporate's zero-value statistics on a new Academy). That is how the rule above was found and made explicit: in the `rich` state, where the Academy has data, the statistics and instructors headings must and do still show.

## 4. Retired from selection (this change)

- **Backend:**
  - `SELECTABLE_WEBSITE_THEME_KEYS = ['modern-education']` and `RETIRED_WEBSITE_THEME_KEYS` (the four). `WEBSITE_THEME_KEYS` is both lists together: every key the code knows.
  - Both DTOs accept selectable keys only, so a retired key gets `400`.
  - Provisioning maps a retired key to Theme 1.
- **Frontend:**
  - The same three lists.
  - `listWebsiteThemes()` offers Theme 1 only, in both the Theme tab and provisioning.
  - A website still on a retired theme sees it as its active theme, disabled, next to Theme 1 until it moves.
- **Kept on purpose until the production migration is verified:** the retired themes' definitions, base packs, templates and baseline fixtures. A website still on one renders exactly as before, so deploying this code changes no live website by itself.
- **Kept for good:** the ThemePack registry, `createBasePack`, the base renderers (every section type still has one; they are the fallback), and the base brand mapping. Theme 1 isn't hard-coded anywhere new: adding a theme means a key in the selectable list, one theme definition and one pack.
- **Tests updated only where obsolete:**
  - backend e2e 3b/3d/3e now provision Theme 1 (3b also asserts the provenance stamp); new tests assert that a retired key is refused in provisioning and in the website configuration;
  - the J8e journey now asserts refusal instead of provisioning a Theme 2 website.

## 5. Production order (gated; nothing here has been run)

1. Deploy this code. It changes no website's look: retired themes still render.
2. Run the dry run against production. Review `plan.json`: the counts per theme, every unmappable section, the pending provisioning requests.
3. Resolve any unmappable section with the Owner concerned.
4. Take a database backup. Apply with `--plan`. Keep `applied.json` (it is the rollback input).
5. Verify: re-run the dry run (expect `toMove: 0`), spot-check moved websites in EN/AR on desktop and mobile, and watch errors.
6. Only then, in a separate change, delete:
   - the retired theme definitions, base-pack registrations and templates;
   - `shared-support-pages.template.ts`;
   - their baseline fixtures, screenshots and Lighthouse entries;
   - their i18n names.

   Also remove the retired keys from `WEBSITE_THEME_KEYS`.

**Product decision (not changed):** the `multipleThemes` plan entitlement and pricing copy ("Multiple themes") become misleading with one selectable theme.
