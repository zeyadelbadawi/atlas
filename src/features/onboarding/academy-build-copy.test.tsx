/**
 * B0-CPY-08 — the build screen promises nothing the new academy lacks
 * (no offline-reading highlight while text lessons are not delivered,
 * B0-LRN-01) and its checklist summarises what the academy includes
 * instead of narrating installation work that is not happening.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import {
  AcademyBuildExperience,
  BUILD_HIGHLIGHT_KEYS,
  resetAcademyBuildTimersForTests,
} from '@components/academy-build';

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
  resetAcademyBuildTimersForTests();
});

function renderBuild(language: 'en' | 'ar') {
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AcademyBuildExperience
        requestId="req-copy"
        academyName="Nile Academy"
        serverReady={false}
        onComplete={() => undefined}
      />
    </I18nextProvider>
  );
}

describe('academy build screen copy', () => {
  it('drops the offline highlight from the rotation', () => {
    expect(BUILD_HIGHLIGHT_KEYS).not.toContain('offline');
  });

  it('titles the checklist as what the academy includes (EN)', () => {
    renderBuild('en');
    expect(
      screen.getByRole('list', { name: "Here's what your academy includes" })
    ).toBeTruthy();
    const text = screen.getByTestId('academy-build').textContent ?? '';
    expect(text).not.toMatch(/installing|creating your|connection drops/i);
  });

  it('titles the checklist as what the academy includes (AR)', () => {
    renderBuild('ar');
    expect(
      screen.getByRole('list', { name: 'إليك ما تتضمنه أكاديميتك' })
    ).toBeTruthy();
    const text = screen.getByTestId('academy-build').textContent ?? '';
    expect(text).not.toMatch(/جارٍ تثبيت|انقطاع الاتصال/);
  });
});
