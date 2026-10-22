/**
 * Theme 1 plan Phase 2 — frontend/backend section-contract parity. The cases
 * file is byte-identical in atlas-backend
 * (`src/website/validation/__parity__`), whose suite asserts the same
 * outcomes against the API's schemas, so the editor can never accept what
 * the API rejects (or the reverse). A case's `preserves` paths must come out
 * of the parse exactly as they went in: a key the schema does not declare is
 * silently stripped.
 */
import { describe, expect, it } from 'vitest';
import { SECTION_TYPES } from '@types';
import type { SectionType } from '@types';
import parity from './__parity__/section-contracts-theme1.cases.json';
import { getSectionConfigSchema } from './website-section.schemas';

interface ParityCase {
  readonly name: string;
  readonly type: SectionType;
  readonly config: unknown;
  readonly valid: boolean;
  readonly preserves?: readonly string[];
}

function at(value: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      value
    );
}

const cases = parity.cases as ParityCase[];

describe('section contracts — parity cases', () => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, parityCase) => {
    expect(SECTION_TYPES).toContain(parityCase.type);
    const result = getSectionConfigSchema(parityCase.type).safeParse(
      parityCase.config
    );
    expect(result.success).toBe(parityCase.valid);
    for (const path of parityCase.preserves ?? []) {
      expect(at(result.data, path)).toEqual(at(parityCase.config, path));
      expect(at(parityCase.config, path)).toBeDefined();
    }
  });
});
