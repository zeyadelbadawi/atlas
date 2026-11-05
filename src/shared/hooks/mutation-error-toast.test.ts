/**
 * B0 (UX audit) — a failed action shows ONE toast that says what went wrong.
 */
import { describe, expect, it } from 'vitest';
import en from '@/localization/resources/en/errors.json';
import ar from '@/localization/resources/ar/errors.json';
import enValidation from '@/localization/resources/en/validation.json';
import { createApiError } from '@services';
import { mutationErrorToast } from './mutation-error-toast';

/** Resolves `ns:a.b.c` against the real EN catalogues. */
function exists(key: string): boolean {
  const [ns, path] = key.split(':');
  const root = ns === 'errors' ? en : ns === 'validation' ? enValidation : null;
  if (!root || !path) return false;
  let node: unknown = root;
  for (const part of path.split('.')) {
    if (typeof node !== 'object' || node === null || !(part in node)) return false;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string';
}

const online = { exists, online: true };

describe('mutationErrorToast', () => {
  it('says nothing for a cancelled request', () => {
    expect(mutationErrorToast(createApiError('cancelled'), online)).toBeNull();
  });

  it('carries the backend reason instead of a generic "try again"', () => {
    const toast = mutationErrorToast(
      createApiError('conflict', { messageKey: 'errors.domain.hostnameTaken' }),
      online
    );
    expect(toast).toEqual({
      titleKey: 'errors:conflict.title',
      descriptionKey: 'errors:domain.hostnameTaken',
    });
  });

  it('names the first invalid field of a rejected form', () => {
    const toast = mutationErrorToast(
      createApiError('validation', {
        violations: [{ field: 'contactEmail', messageKey: 'validation:email' }],
      }),
      online
    );
    expect(toast).toEqual({
      titleKey: 'errors:validation.title',
      descriptionKey: 'validation:email',
      values: { field: 'Contact email' },
    });
  });

  it('uses action copy, not page copy, when the item is gone or not allowed', () => {
    expect(mutationErrorToast(createApiError('notFound'), online)).toEqual({
      titleKey: 'errors:mutation.notFoundTitle',
      descriptionKey: 'errors:mutation.notFound',
    });
    expect(mutationErrorToast(createApiError('forbidden'), online)).toEqual({
      titleKey: 'errors:mutation.forbiddenTitle',
      descriptionKey: 'errors:mutation.forbidden',
    });
  });

  it('never puts an unknown backend key on screen', () => {
    const toast = mutationErrorToast(
      createApiError('server', { messageKey: 'errors.never.translated' }),
      online
    );
    expect(toast?.descriptionKey).toBe('errors:server.description');
  });

  it('explains that nothing was saved while offline', () => {
    const toast = mutationErrorToast(createApiError('network'), { exists, online: false });
    expect(toast?.titleKey).toBe('common:connectivity.actionNeedsConnection.title');
  });

  it("keeps a caller's explicit message", () => {
    const toast = mutationErrorToast(createApiError('server'), {
      ...online,
      errorMessageKey: 'course:errors.publishFailed',
    });
    expect(toast).toEqual({ titleKey: 'course:errors.publishFailed' });
  });

  it('has the new action copy in both languages', () => {
    for (const catalogue of [en, ar]) {
      expect(catalogue.mutation.notFound).toBeTruthy();
      expect(catalogue.mutation.forbidden).toBeTruthy();
      expect(catalogue.mutation.notFoundTitle).toBeTruthy();
      expect(catalogue.mutation.forbiddenTitle).toBeTruthy();
    }
  });
});
