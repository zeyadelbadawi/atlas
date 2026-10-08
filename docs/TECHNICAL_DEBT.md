# Technical debt register

Known, deliberately deferred issues. Each entry says why it is safe today,
what would make it unsafe, and the intended fix.

## TD-1 — Import cycles added by the Local-first / Customer Requests release (Oct 2026)

`npx madge --circular --extensions ts,tsx --ts-config tsconfig.app.json src`
reports **28** cycles on this release against **26** on `main` before it.
Most of the existing ones are barrel-shaped (`index.ts` re-exports). The
two new ones are:

1. **academy ↔ customer-requests** (and, through the same edge,
   domain → customer-requests → academy → domain)
   `features/academy` (the dashboard page renders the "Request a custom
   feature" card) → `features/customer-requests` → `useAcademyScope` from
   `features/academy`.
2. **api ↔ identity ↔ offline**
   `services/api` → `services/identity` (session service) →
   `services/offline` → `normalizeUnknownError` from `services/api`.

**Why it is harmless today.** In both cycles, the module that closes the
loop is used only inside function bodies (React hooks, an async drain
loop), never while modules are being evaluated, so ES module evaluation
order cannot leave a binding undefined when it is used. Verified on this
release: `tsc` clean, ESLint clean, `vite build` clean, and the full Vitest
suite and the J45/J46 browser journeys pass against the built app.

**What would make it unsafe.** Using one of those imports at module top
level, for example in a constant initialiser, a class `extends`, or a
default argument evaluated at load, inside any file on the loop.

**Intended fix (not in this release).**

- Move `AcademyScopeContext` / `useAcademyScope` from `features/academy`
  to a shared module (e.g. `src/shared/academy-scope/`) that both features
  import, which breaks cycle 1.
- Move `normalizeUnknownError` (with `ApiError` / `createApiError`) into a
  dependency-free `services/api/errors` entry, and import it directly from
  `services/offline` instead of the `@api` barrel, which breaks cycle 2.

Both are mechanical moves with wide import churn, so they were kept out of
the feature release on purpose.
