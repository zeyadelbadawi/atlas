/**
 * `apiErrorMessage` must always return a sentence. The backend sends the
 * generic `errors.notFound` for many 404s, and in the frontend that key is a
 * GROUP (`{ title, description }`); `t` on a group returned an object that
 * rendered as garbled text in every caller.
 */
import { describe, expect, it } from 'vitest';
import { ApiError } from '@services/api/api-error';
import { createI18nInstance } from '@/localization/i18n';
import { apiErrorMessage } from './api-error-copy.utils';

const i18n = createI18nInstance('en');
const t = i18n.t.bind(i18n);

describe('apiErrorMessage', () => {
  it('uses a group key’s description instead of returning an object', () => {
    const error = new ApiError({
      kind: 'notFound',
      messageKey: 'errors.notFound',
      status: 404,
      retryable: false,
    });
    const copy = apiErrorMessage(t, i18n, error);
    expect(typeof copy).toBe('string');
    expect(copy).toBe(i18n.t('errors:notFound.description'));
  });

  it('still uses a leaf key directly', () => {
    const error = new ApiError({
      kind: 'conflict',
      messageKey: 'errors.course.hasLearnerActivity',
      status: 409,
      retryable: false,
    });
    expect(apiErrorMessage(t, i18n, error)).toMatch(/unpublish/i);
  });
});
