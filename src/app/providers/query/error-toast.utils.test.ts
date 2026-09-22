import { describe, expect, it } from 'vitest';
import { errorToastDescriptionKey } from './error-toast.utils';

describe('errorToastDescriptionKey', () => {
  it('namespaces a backend messageKey the catalogue holds', () => {
    const exists = (key: string) => key === 'errors:tenancy.notAMember';
    expect(
      errorToastDescriptionKey(
        { kind: 'forbidden', messageKey: 'errors.tenancy.notAMember' },
        exists
      )
    ).toBe('errors:tenancy.notAMember');
  });

  it('falls back to the per-kind description when the key is not translated', () => {
    expect(
      errorToastDescriptionKey(
        { kind: 'forbidden', messageKey: 'errors.academy.somethingNew' },
        () => false
      )
    ).toBe('errors:forbidden.description');
  });

  it('leaves an already-namespaced key untouched when it exists', () => {
    expect(
      errorToastDescriptionKey(
        { kind: 'server', messageKey: 'errors:server.description' },
        (key) => key === 'errors:server.description'
      )
    ).toBe('errors:server.description');
  });
});
