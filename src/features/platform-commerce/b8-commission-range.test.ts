/**
 * B8 (UX audit) V29 — a commission percentage out of 0–100 says so ("-5"
 * read "up to two decimal places" because the format was checked first).
 */
import { describe, expect, it } from 'vitest';
import { percentageField } from './schemas/platform-commerce.schemas';

describe('V29 — commission: the range before the decimals', () => {
  const messageOf = (value: string) => {
    const result = percentageField.safeParse(value);
    return result.success ? null : result.error.issues[0]?.message;
  };

  it.each(['-5', '250', '100.5', '-0.5'])('%s says 0–100', (value) => {
    expect(messageOf(value)).toBe('platformCommerce:validation.percentRange');
  });

  it('12.345 says two decimals', () => {
    expect(messageOf('12.345')).toBe(
      'platformCommerce:validation.percentFormat'
    );
  });

  it('accepts 0, 12.5 and 100', () => {
    for (const value of ['0', '12.5', '100'])
      expect(messageOf(value)).toBeNull();
  });
});
