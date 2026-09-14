/**
 * The student's Live Session page renders the SERVER's answer.
 *
 * The backend decides joinability and says WHY it refused; the value of
 * this page is entirely in spending that reason well. So these tests are
 * about the honesty of the rendering, not about access control — no
 * assertion here could grant access, because nothing in this component
 * decides it. `live-session-access.service.spec.ts` owns that, and
 * `authorizeJoin` re-checks every condition when a grant is actually
 * minted, whatever this page drew.
 *
 * The two failure modes worth guarding are opposite and both bad: showing
 * a join button that the server will refuse (a student clicking into a
 * dead end), and hiding one that would work (a student missing a class
 * they could have attended).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { LiveSessionEligibility, JoinRefusalReason } from '@types';

const useLiveSessionEligibility = vi.fn();

vi.mock('react-router-dom', () => ({
  useParams: () => ({ courseId: 'course-1', liveSessionId: 'session-1' }),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('./hooks/useStudentLiveSessions', () => ({
  useLiveSessionEligibility: () => useLiveSessionEligibility() as unknown,
  useStudentCourseLiveSessions: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/shared/hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, useAuth: () => ({ user: { name: 'Sara' } }) };
});

// Only `toast` is replaced; the module's other exports (`useToast`, used
// by the toast provider elsewhere in the tree) must survive.
vi.mock('@/hooks/use-toast', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return { ...actual, toast: vi.fn() };
});

/*
 * The SDK is never loaded in a test. It is a ten-megabyte browser bundle
 * that needs a real meeting to do anything, and stubbing it would prove
 * only that the stub works.
 */
vi.mock('./components/ZoomMeetingEmbed', () => ({
  ZoomMeetingEmbed: () => 'meeting',
}));

import StudentLiveSessionPage from './pages/StudentLiveSessionPage';

const eligibility = (
  over: Partial<LiveSessionEligibility> = {},
): LiveSessionEligibility => ({
  joinable: false,
  isHost: false,
  status: 'scheduled',
  title: 'Algebra II',
  scheduledStartAt: '2026-10-01T10:00:00Z',
  scheduledEndAt: '2026-10-01T11:00:00Z',
  ...over,
});

function renderPage(language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  return render(
    <I18nextProvider i18n={i18n}>
      <StudentLiveSessionPage />
    </I18nextProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('StudentLiveSessionPage', () => {
  it('offers Join when the server says the student may join', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({ joinable: true }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByRole('button', { name: /join session/i })).toBeTruthy();
  });

  /* A host STARTS a class; they do not join it. */
  it('offers Start to the host rather than Join', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({ joinable: true, isHost: true }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByRole('button', { name: /start session/i })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /join session/i })).toBeNull();
  });

  /*
   * EVERY REFUSAL GETS ITS OWN SENTENCE. A single "you can't join" for all
   * of these would be the easy version and the useless one — "starts
   * shortly" and "your academy must reconnect Zoom" are the same HTTP
   * outcome and completely different human problems.
   */
  const refusals: ReadonlyArray<[JoinRefusalReason, RegExp]> = [
    ['too_early', /not open yet/i],
    ['too_late', /finished/i],
    ['cancelled', /instructor cancelled this session/i],
    ['not_published', /not available yet/i],
    ['not_enrolled', /not enrolled/i],
    ['provider_unavailable', /reconnect zoom/i],
    ['add_on_unavailable', /unavailable/i],
  ];

  it.each(refusals)('explains the %s refusal specifically', (reason, expected) => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({ joinable: false, reason }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText(expected)).toBeTruthy();
    // The refusal is explained, never contradicted by a live button.
    expect(screen.queryByRole('button', { name: /join session/i })).toBeNull();
  });

  /* An unrecognised reason must still produce a sentence, never a raw key. */
  it('falls back to an honest message for an unknown reason', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({
        joinable: false,
        reason: 'something_new' as JoinRefusalReason,
      }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText(/can't join right now/i)).toBeTruthy();
    expect(screen.queryByText(/liveSessions:/)).toBeNull();
  });

  it('shows an error state rather than a blank page when the read fails', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('boom'),
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText(/couldn't load this session/i)).toBeTruthy();
  });

  /*
   * ARABIC RENDERS ARABIC. A missing key would surface as the raw
   * `liveSessions:student…` string, which is the failure this catches.
   */
  it('renders the refusal in Arabic with no missing keys', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({ joinable: false, reason: 'too_early' }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/liveSessions:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });

  it('renders the join action in Arabic', () => {
    useLiveSessionEligibility.mockReturnValue({
      data: eligibility({ joinable: true }),
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/liveSessions:/);
    expect(container.textContent).toMatch(/انضمّ/);
  });
});
