/**
 * The active academy survives a page load.
 *
 * `setActiveAcademy` persisted to `atlas:active-academy` and nothing ever
 * read it back, so `activeAcademyId` was `undefined` after every refresh.
 * That is not a cosmetic loss: the entire academy-scoped sidebar section is
 * built only `if (activeAcademyId)`, so Courses, Members, Branding,
 * Settings and Website vanished on reload and stayed gone until the user
 * happened to touch the switcher again.
 *
 * Found while verifying the new Academy Media entry in production — the
 * item was correctly wired and still invisible, because every one of its
 * neighbours was invisible too.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { STORAGE_KEYS } from '@constants';
import { AtlasPlatformProvider } from './PlatformProvider';
import { usePlatform } from '@hooks';

afterEach(() => {
  cleanup();
  localStorage.clear();
});

function ActiveAcademyProbe(): JSX.Element {
  const { activeAcademyId } = usePlatform();
  return <span data-testid="probe">{activeAcademyId ?? 'none'}</span>;
}

function renderProvider() {
  return render(
    <AtlasPlatformProvider>
      <ActiveAcademyProbe />
    </AtlasPlatformProvider>,
  );
}

describe('AtlasPlatformProvider — active academy restoration', () => {
  it('restores the active academy that was persisted before the reload', () => {
    localStorage.setItem(STORAGE_KEYS.activeAcademy, 'academy-1');

    renderProvider();

    expect(screen.getByTestId('probe').textContent).toBe('academy-1');
  });

  it('restores it even when user preferences are also stored', () => {
    localStorage.setItem(STORAGE_KEYS.activeAcademy, 'academy-2');
    localStorage.setItem(
      STORAGE_KEYS.userPreferences,
      JSON.stringify({ sidebarCollapsed: true }),
    );

    renderProvider();

    expect(screen.getByTestId('probe').textContent).toBe('academy-2');
  });

  it('reports none when nothing was persisted', () => {
    renderProvider();
    expect(screen.getByTestId('probe').textContent).toBe('none');
  });

  /*
   * A corrupted preferences blob must not take the academy down with it —
   * the two are stored separately and one being unreadable says nothing
   * about the other.
   */
  it('still restores the academy when the preferences blob is corrupt', () => {
    localStorage.setItem(STORAGE_KEYS.activeAcademy, 'academy-3');
    localStorage.setItem(STORAGE_KEYS.userPreferences, '{not json');

    renderProvider();

    expect(screen.getByTestId('probe').textContent).toBe('academy-3');
  });
});
