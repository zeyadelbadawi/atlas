/**
 * Fix round (20 Oct 2026) — a learner signed in to an academy that has not
 * admitted them is told so above every `/my/*` section: pending → the
 * awaiting-approval copy; rejected → "not admitted", with "Apply again",
 * which ends this session and opens the sign-up page's join step (the
 * academy's registration policy then decides). Active and blocked learners
 * see nothing here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { LearnerAcademy } from '@types';

let academies: LearnerAcademy[] = [];
const signOut = vi.fn(async () => undefined);

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ user: { id: 'u-1', academies } }),
  useSignOut: () => ({ signOut, isLoading: false }),
}));

vi.mock('./context/LearnerSurface.context', () => ({
  useLearnerSurface: () => ({
    academyId: 'aca-1',
    locale: 'en',
    buildHref: (path: string) => `/ar${path}`,
  }),
}));

const { LearnerMembershipNotice } =
  await import('./components/LearnerMembershipNotice');

function membership(over: Partial<LearnerAcademy>): LearnerAcademy {
  return {
    academyId: 'aca-1',
    name: 'Nile Academy',
    slug: 'nile',
    membershipStatus: 'active',
    blocked: false,
    ...over,
  };
}

function renderNotice(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <LearnerMembershipNotice />
    </I18nextProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  academies = [];
});

describe('LearnerMembershipNotice', () => {
  it('tells a rejected learner they were not admitted, and "Apply again" opens the join step signed out', async () => {
    academies = [membership({ membershipStatus: 'inactive' })];
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...original, assign },
    });
    try {
      renderNotice();
      const notice = screen.getByTestId('learner-membership-rejected');
      expect(notice.textContent).toContain(
        "You haven't been admitted to this academy"
      );
      fireEvent.click(screen.getByRole('button', { name: 'Apply again' }));
      await waitFor(() =>
        expect(assign).toHaveBeenCalledWith('/ar/sign-up?join=1')
      );
      expect(signOut).toHaveBeenCalledTimes(1);
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      });
    }
  });

  it('shows the awaiting-approval copy to a pending learner', () => {
    academies = [membership({ membershipStatus: 'pending' })];
    renderNotice();
    expect(
      screen.getByTestId('learner-membership-pending').textContent
    ).toContain('Your membership is awaiting approval');
    expect(screen.queryByRole('button', { name: 'Apply again' })).toBeNull();
  });

  it.each([
    ['an active learner', membership({})],
    [
      'a blocked learner',
      membership({ membershipStatus: 'inactive', blocked: true }),
    ],
    [
      'another academy’s rejection',
      membership({ academyId: 'aca-2', membershipStatus: 'inactive' }),
    ],
  ])('shows nothing to %s', (_label, row) => {
    academies = [row];
    const { container } = renderNotice();
    expect(container.textContent).toBe('');
  });

  it('is written in Arabic too', () => {
    academies = [membership({ membershipStatus: 'inactive' })];
    renderNotice('ar');
    expect(screen.getByText('لم يتم قبولك في هذه الأكاديمية')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'التقدّم مرة أخرى' })
    ).toBeTruthy();
  });
});
