/**
 * B8 (UX audit) V23 — the trial length is a whole number of days from 1 to
 * 365, the server's own range (atlas-backend#108): 0 and 1000 used to be
 * sent; Arabic digits count as digits.
 */
import { describe, expect, it } from 'vitest';
import { updateTrialPolicySchema } from './schemas/tenant.schemas';

describe('V23 — trial policy length', () => {
  it.each(['0', '1000', '', 'abc', '2.5'])('%s is refused', (value) => {
    const result = updateTrialPolicySchema.safeParse({
      enabled: true,
      durationDays: value,
    });
    expect(result.success).toBe(false);
  });

  it.each(['1', '14', '365', '١٤'])('%s is accepted', (value) => {
    expect(
      updateTrialPolicySchema.safeParse({ enabled: true, durationDays: value })
        .success
    ).toBe(true);
  });
});
