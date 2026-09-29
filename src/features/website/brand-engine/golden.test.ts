/**
 * Golden vectors — the frontend/backend parity contract (Theme 1 plan
 * §F.4.3, §I.1 "brand-engine golden vectors").
 *
 * `__golden__/bp-1.golden.json` holds inputs AND expected outputs. This
 * suite checks the browser engine reproduces them exactly; the backend's
 * mirror (`atlas-backend/src/website/brand-engine`) runs the same file
 * through its own copy. Both green = the live preview and the API's
 * authority derive and judge palettes identically.
 *
 * Regenerate ONLY with an intended engine change (and a new
 * `algorithmVersion` if outputs change for stored palettes):
 *   BRAND_GOLDEN_UPDATE=1 pnpm vitest run src/features/website/brand-engine/golden.test.ts
 * then copy the file to the backend mirror.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildBrandPalette, deriveBrandPalette } from './derive';
import {
  BRAND_ENGINE_ALGORITHM_VERSION,
  BRAND_PALETTE_VARIANTS,
  type BrandOverrides,
  type BrandPaletteVariant,
  type BrandSeeds,
} from './palette.types';
import { validateBrandPalette } from './validate';

const GOLDEN_FILE = join(
  dirname(fileURLToPath(import.meta.url)),
  '__golden__',
  `${BRAND_ENGINE_ALGORITHM_VERSION}.golden.json`
);

interface GoldenInput {
  readonly name: string;
  readonly seeds: BrandSeeds;
  readonly variant: BrandPaletteVariant;
  readonly overrides?: BrandOverrides;
  readonly neutralChromaCap?: number;
}

/** §I.2's 12-brand identity matrix (seed form), plus edge cases. */
const IDENTITY_MATRIX: Record<string, BrandSeeds> = {
  blue: { primary: '221 83% 53%' },
  orange: {
    primary: '24 95% 53%',
    secondary: '199 89% 38%',
    accent: '43 96% 56%',
  },
  purple: {
    primary: '262 70% 50%',
    secondary: '330 75% 55%',
    accent: '174 60% 42%',
  },
  neonYellow: {
    primary: '66 100% 50%',
    secondary: '0 0% 10%',
    accent: '190 100% 45%',
  },
  pastelPink: { primary: '340 80% 88%' },
  nearBlack: { primary: '220 15% 8%' },
  monochrome: { primary: '0 0% 35%', secondary: '0 0% 70%' },
  redNearErrorHue: { primary: '2 80% 50%' },
  teal: { primary: '174 60% 42%' },
  brown: { primary: '25 45% 32%', accent: '40 70% 60%' },
  multiColour: {
    primary: '221 83% 53%',
    secondary: '24 95% 53%',
    accent: '150 60% 40%',
  },
  // No logo: Theme 1's default colours as seeds.
  noLogoThemeDefault: {
    primary: '217 91% 55%',
    secondary: '173 65% 40%',
    accent: '38 92% 55%',
  },
};

function inputs(): GoldenInput[] {
  const cases: GoldenInput[] = [];
  for (const [name, seeds] of Object.entries(IDENTITY_MATRIX)) {
    for (const variant of BRAND_PALETTE_VARIANTS) {
      cases.push({ name: `${name}/${variant}`, seeds, variant });
    }
  }
  cases.push(
    {
      name: 'override/seed-primary',
      seeds: IDENTITY_MATRIX.blue,
      variant: 'balanced',
      overrides: { primary: '150 70% 35%' },
    },
    {
      name: 'override/role-link-passing',
      seeds: IDENTITY_MATRIX.blue,
      variant: 'balanced',
      overrides: { link: '221 83% 30%' },
    },
    {
      name: 'override/role-link-failing',
      seeds: IDENTITY_MATRIX.blue,
      variant: 'balanced',
      overrides: { link: '221 83% 75%' },
    },
    {
      name: 'override/role-cta-failing-label',
      seeds: IDENTITY_MATRIX.blue,
      variant: 'balanced',
      overrides: { cta: '60 90% 75%' },
    },
    {
      name: 'override/accent-decorative',
      seeds: IDENTITY_MATRIX.blue,
      variant: 'vivid',
      overrides: { accent: '55 95% 70%' },
    },
    {
      name: 'cap/other-theme-0.03',
      seeds: IDENTITY_MATRIX.orange,
      variant: 'balanced',
      neutralChromaCap: 0.03,
    }
  );
  return cases;
}

function compute(input: GoldenInput) {
  const options = {
    variant: input.variant,
    overrides: input.overrides,
    neutralChromaCap: input.neutralChromaCap,
  };
  const derived = deriveBrandPalette(input.seeds, options);
  const palette = buildBrandPalette({
    seeds: input.seeds,
    source: 'manual',
    ...options,
  });
  return { derived, validation: validateBrandPalette(palette) };
}

describe(`brand engine — golden vectors (${BRAND_ENGINE_ALGORITHM_VERSION})`, () => {
  if (process.env.BRAND_GOLDEN_UPDATE === '1') {
    it('writes the golden file', () => {
      const vectors = inputs().map((input) => ({
        input,
        expected: compute(input),
      }));
      writeFileSync(
        GOLDEN_FILE,
        `${JSON.stringify({ algorithmVersion: BRAND_ENGINE_ALGORITHM_VERSION, vectors }, null, 2)}\n`
      );
    });
    return;
  }

  const golden = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')) as {
    algorithmVersion: string;
    vectors: { input: GoldenInput; expected: ReturnType<typeof compute> }[];
  };

  it('covers every input this suite defines', () => {
    expect(golden.algorithmVersion).toBe(BRAND_ENGINE_ALGORITHM_VERSION);
    expect(golden.vectors.map((vector) => vector.input)).toEqual(
      JSON.parse(JSON.stringify(inputs()))
    );
  });

  for (const vector of golden.vectors) {
    it(vector.input.name, () => {
      expect(JSON.parse(JSON.stringify(compute(vector.input)))).toEqual(
        vector.expected
      );
    });
  }
});
