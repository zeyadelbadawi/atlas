import { describe, expect, it } from 'vitest';
import { addCustomDomainSchema } from './domain.schemas';

describe('addCustomDomainSchema (P63g)', () => {
  it('trims and lowercases BEFORE validating, so a pasted hostname is accepted', () => {
    expect(
      addCustomDomainSchema.parse({ hostname: '  Learn.Example.COM ' })
    ).toEqual({
      hostname: 'learn.example.com',
    });
  });

  it("reports the domain feature's own messages, never a generic field template", () => {
    const short = addCustomDomainSchema.safeParse({ hostname: 'a.b' });
    expect(short.success).toBe(false);
    if (!short.success)
      expect(short.error.issues[0].message).toBe(
        'website:domain.validation.tooShort'
      );
    const invalid = addCustomDomainSchema.safeParse({
      hostname: 'https://x.example.com',
    });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(invalid.error.issues[0].message).toBe(
        'website:domain.validation.invalid'
      );
  });
});
