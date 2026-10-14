/**
 * CF-32 — the assignment attachment picker must offer exactly what the
 * server accepts for a submission (PDF, JPEG, PNG, GIF, WebP; sniffed by
 * bytes in `detectFileKind`). Word files were offered and always refused.
 */
import { describe, expect, it } from 'vitest';
import en from '@localization/resources/en/learning.json';
import ar from '@localization/resources/ar/learning.json';
import { ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES } from './constants/learning.constants';

describe('assignment attachment types', () => {
  it('offers no Word types', () => {
    expect(ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES).not.toContain(
      'application/msword'
    );
    expect(
      ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES.some((type) =>
        type.includes('wordprocessingml')
      )
    ).toBe(false);
  });

  it('offers every type the server accepts', () => {
    for (const type of [
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/gif',
      'image/webp',
    ]) {
      expect(ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES).toContain(type);
    }
  });

  it('tells learners to save Word documents as PDF (EN + AR)', () => {
    expect(en.assignment.attachmentHelp).toContain(
      'Save Word documents as PDF'
    );
    expect(ar.assignment.attachmentHelp).toContain(
      'احفظ مستندات Word بصيغة PDF'
    );
  });
});
