/**
 * B3 (UX audit, V10/V23) — the media picker states its rules, checks them
 * before uploading, and a refusal names the limit.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@services';
import {
  acceptedTypeNames,
  matchesAccept,
} from './components/MediaLibraryDialog';
import { MediaUploadProgress } from './components/MediaUploadProgress';

afterEach(cleanup);

describe('picker rules', () => {
  it('names the accepted types', () => {
    expect(
      acceptedTypeNames('image/png,image/jpeg,image/jpg,image/webp')
    ).toEqual(['PNG', 'JPG', 'WebP']);
    expect(acceptedTypeNames('image/*')).toBeNull();
  });

  it('checks a file against the list', () => {
    expect(matchesAccept('image/png', 'image/png,image/webp')).toBe(true);
    expect(matchesAccept('application/pdf', 'image/png,image/webp')).toBe(
      false
    );
    expect(matchesAccept('image/gif', 'image/*')).toBe(true);
    expect(matchesAccept('text/plain', 'image/*')).toBe(false);
  });
});

describe('upload row (V23)', () => {
  const failed = (messageKey: string, details?: Record<string, number>) => ({
    stage: 'failed' as const,
    fileName: 'big.pdf',
    fileSizeBytes: 21 * 1024 * 1024,
    error: createApiError('server', { messageKey, details }),
  });

  it.each(['en', 'ar'] as const)(
    'names the limit (%s) and offers no Retry',
    (lang) => {
      render(
        <I18nextProvider i18n={createI18nInstance(lang)}>
          <MediaUploadProgress
            state={
              failed('errors.media.fileTooLarge', {
                maxBytes: 10 * 1024 * 1024,
              }) as never
            }
            onRetry={() => {}}
            onDismiss={() => {}}
          />
        </I18nextProvider>
      );
      const text =
        screen.getByTestId('media-upload-progress').textContent ?? '';
      expect(text).toMatch(/10|١٠/);
      expect(text).toContain(lang === 'en' ? 'larger than' : 'أكبر من');
      expect(
        screen.queryByRole('button', {
          name: lang === 'en' ? /retry/i : /إعادة/,
        })
      ).toBeNull();
    }
  );

  it('keeps Retry for a failure a second try can clear', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <MediaUploadProgress
          state={failed('errors.internal') as never}
          onRetry={() => {}}
          onDismiss={() => {}}
        />
      </I18nextProvider>
    );
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy();
  });
});
