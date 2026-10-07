/**
 * Theme packs load on demand in the app (`theme-pack.loader.ts`): a page
 * renders its theme once the pack's chunk and stylesheet have arrived, and
 * the public site loads it before its first render. Tests render themes
 * synchronously, as the public site does after that preload, so the packs
 * are registered before the tests of the features that render themes.
 *
 * Imported in `beforeAll`, after the test file's own imports and mocks, so
 * a test's `vi.mock` applies to the packs' modules too (a static import
 * here would load them first, unmocked, for every test file). The loader's
 * own on-demand behaviour is tested with a fresh module instance
 * (`theme-pack.loader.test.tsx`).
 */
import { beforeAll, expect } from 'vitest';

/** Test files under these folders may render a theme. */
const THEMED_TESTS =
  /[\\/]src[\\/](?:features[\\/](?:website|public-website|provisioning|onboarding)|ssr)[\\/]/;

beforeAll(async () => {
  if (!THEMED_TESTS.test(expect.getState().testPath ?? '')) return;
  const [
    { registerThemePack },
    { MODERN_EDUCATION_PACK },
    { ATELIER_PACK },
    { MANARA_PACK },
    { RIWAQ_PACK },
  ] = await Promise.all([
    import('@/features/website/theme-packs/theme-pack.loader'),
    import('@/features/website/modern-education/modern-education.pack'),
    import('@/features/website/atelier/atelier.pack'),
    import('@/features/website/manara/manara.pack'),
    import('@/features/website/riwaq/riwaq.pack'),
  ]);
  registerThemePack(MODERN_EDUCATION_PACK);
  registerThemePack(ATELIER_PACK);
  registerThemePack(MANARA_PACK);
  registerThemePack(RIWAQ_PACK);
  // The first import of the packs in a worker can take a while under a
  // loaded full run; it is module loading, not a hanging test.
}, 120_000);
