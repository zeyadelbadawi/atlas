/**
 * B1 (UX audit V12) — a ticket over the length limit used to say "Please
 * enter a subject of at least 3 characters": the opposite of the problem.
 */
import { describe, expect, it } from 'vitest';
import en from '@/localization/resources/en/support.json';
import ar from '@/localization/resources/ar/support.json';
import { createSupportCaseSchema } from './components/CreateSupportCaseDialog';

function messages(subject: string, description: string): Record<string, string> {
  const result = createSupportCaseSchema.safeParse({ subject, description });
  if (result.success) return {};
  return Object.fromEntries(result.error.issues.map((i) => [String(i.path[0]), i.message]));
}

describe('support ticket limits', () => {
  it('says "too long" for over-long text, not "at least"', () => {
    expect(messages('x'.repeat(201), 'y'.repeat(5001))).toEqual({
      subject: 'support:create.subjectTooLong',
      description: 'support:create.descriptionTooLong',
    });
  });

  it('keeps "at least" for text that is too short', () => {
    expect(messages('ab', 'short')).toEqual({
      subject: 'support:create.subjectInvalid',
      description: 'support:create.descriptionInvalid',
    });
  });

  it('has the new copy in both languages', () => {
    for (const catalogue of [en, ar]) {
      expect(catalogue.create.subjectTooLong).toContain('{{count}}');
      expect(catalogue.create.descriptionTooLong).toContain('{{count}}');
      expect(catalogue.create.characterCount).toContain('{{max}}');
    }
  });
});
