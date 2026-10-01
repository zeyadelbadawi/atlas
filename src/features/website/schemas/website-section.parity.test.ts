/**
 * Theme 1 plan Phase 2 — frontend/backend section-contract parity. The cases
 * file is byte-identical in atlas-backend
 * (`src/website/validation/__parity__`), whose suite asserts the same
 * outcomes against the API's schemas, so the editor can never accept what
 * the API rejects (or the reverse).
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
}

const cases = parity.cases as ParityCase[];

describe('section contracts — parity cases', () => {
  it.each(cases.map((c) => [c.name, c] as const))('%s', (_name, parityCase) => {
    expect(SECTION_TYPES).toContain(parityCase.type);
    expect(
      getSectionConfigSchema(parityCase.type).safeParse(parityCase.config)
        .success
    ).toBe(parityCase.valid);
  });
});
