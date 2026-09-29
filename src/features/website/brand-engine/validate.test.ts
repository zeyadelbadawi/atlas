import { describe, expect, it } from 'vitest';
import { contrastRatio } from './color-space';
import { buildBrandPalette } from './derive';
import type { BrandPalette } from './palette.types';
import { validateBrandPalette } from './validate';

const valid = buildBrandPalette({
  seeds: { primary: '221 83% 53%' },
  source: 'manual',
});

function tamper(changes: Record<string, unknown>): unknown {
  return { ...valid, ...changes };
}

describe('brand engine — palette validation', () => {
  it('accepts a derived palette', () => {
    expect(validateBrandPalette(valid)).toEqual({ valid: true, issues: [] });
  });

  it('rejects a crafted role that fails its contrast pair, naming the pair', () => {
    const palette = tamper({ roles: { ...valid.roles, link: '221 83% 80%' } });
    const result = validateBrandPalette(palette);
    expect(result.valid).toBe(false);
    const failure = result.issues.find((issue) => issue.path === 'roles.link');
    expect(failure?.code).toBe('contrastFailure');
    expect(failure?.messageKey).toBe(
      'website:brand.validation.contrastFailure'
    );
    expect(failure?.pair).toMatchObject({
      fg: 'link',
      bg: 'background',
      required: 4.5,
    });
  });

  it('blames a failing Owner override and suggests the nearest passing value', () => {
    const palette = buildBrandPalette({
      seeds: { primary: '221 83% 53%' },
      source: 'manual',
      overrides: { link: '221 83% 75%' },
    });
    const result = validateBrandPalette(palette);
    expect(result.valid).toBe(false);
    const failure = result.issues.find(
      (issue) => issue.path === 'overrides.link'
    );
    expect(failure?.code).toBe('contrastFailure');
    expect(failure?.suggestion).toBeDefined();
    expect(
      contrastRatio(failure!.suggestion!, palette.roles.background)
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('allows a failing accent only as decoration', () => {
    const pale = buildBrandPalette({
      seeds: { primary: '221 83% 53%', accent: '60 90% 80%' },
      source: 'manual',
    });
    expect(pale.usage.accent).toBe('decorativeOnly');
    expect(validateBrandPalette(pale).valid).toBe(true);
    const claimedFull = { ...pale, usage: { ...pale.usage, accent: 'full' } };
    expect(
      validateBrandPalette(claimedFull).issues.map((issue) => issue.code)
    ).toEqual(['decorativeUsageRequired']);
  });

  it('rejects an override that was not applied (tampered write)', () => {
    const palette = tamper({ overrides: { cta: '10 80% 40%' } });
    expect(
      validateBrandPalette(palette).issues.map((issue) => issue.code)
    ).toContain('overrideNotApplied');
  });

  it('rejects unknown algorithm versions, schema versions and override keys', () => {
    const codes = validateBrandPalette(
      tamper({
        algorithmVersion: 'bp-99',
        schemaVersion: 2,
        overrides: { background2: '0 0% 100%' },
      })
    ).issues.map((issue) => issue.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        'unknownAlgorithmVersion',
        'unsupportedSchemaVersion',
        'unknownOverride',
      ])
    );
  });

  it('rejects malformed colours, missing or extra roles, and non-objects', () => {
    const { cta: _cta, ...missing } = valid.roles;
    expect(
      validateBrandPalette(tamper({ roles: missing })).issues[0]
    ).toMatchObject({
      path: 'roles.cta',
      code: 'invalidColor',
    });
    expect(
      validateBrandPalette(
        tamper({ roles: { ...valid.roles, glow: '0 0% 0%' } })
      ).issues[0].path
    ).toBe('roles.glow');
    expect(
      validateBrandPalette(
        tamper({ roles: { ...valid.roles, cta: 'red; background:url(x)' } })
      ).issues[0].code
    ).toBe('invalidColor');
    expect(validateBrandPalette(tamper({ seeds: {} })).issues[0].path).toBe(
      'seeds.primary'
    );
    expect(validateBrandPalette(null).valid).toBe(false);
    expect(validateBrandPalette([valid]).valid).toBe(false);
  });

  it('recomputes contrast instead of trusting the stored report', () => {
    const lying: BrandPalette = {
      ...valid,
      roles: { ...valid.roles, foreground: '0 0% 60%' },
      report: valid.report,
    };
    expect(validateBrandPalette(lying).valid).toBe(false);
  });
});
