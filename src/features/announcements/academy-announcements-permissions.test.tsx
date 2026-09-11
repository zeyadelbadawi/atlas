/**
 * The academy announcement controls appear exactly when the permission does.
 *
 * The backend side of this is already settled and already tested
 * (`announcements.e2e-spec.ts` covers owner, manager, instructor, student
 * and cross-academy; `p7-tenant-isolation.e2e-spec.ts` covers
 * cross-organization). What was missing was any way for an authorised user
 * to REACH those endpoints: the frontend only ever implemented the
 * course-scoped tree, so an Organization Owner or Manager held
 * `announcement.manage` against a real endpoint with no control anywhere in
 * the product. These tests pin the UI half of that contract.
 *
 * They are NOT a security test and must not be read as one. A hidden button
 * stops nobody — the 403 does, and it is asserted server-side. What these
 * prevent is the opposite failure: shipping a control to someone whose
 * request will be refused, or hiding one from someone entitled to it, which
 * is precisely the defect this task started from.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { Announcement } from '@types';

const hasPermission = vi.fn<(permission: string) => boolean>();

vi.mock('@hooks', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    usePermissions: () => ({ hasPermission }),
    // The panel registers with the unsaved-changes registry; that
    // behaviour has its own suite and is not what is under test here.
    useUnsavedChanges: () => undefined,
  };
});

vi.mock('react-router-dom', () => ({
  useParams: () => ({ academyId: 'academy-1' }),
}));

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: async () => true }),
}));

const announcements: Announcement[] = [
  {
    id: 'a1',
    title: 'Midterm timetable',
    body: 'Published to everyone in the academy.',
    status: 'draft',
  } as Announcement,
];

const listResult = {
  data: { items: announcements },
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};
const idleMutation = {
  mutateAsync: vi.fn(),
  isPending: false,
  error: null,
};

vi.mock('./hooks/useAcademyAnnouncements', () => ({
  useAcademyAnnouncements: () => listResult,
  useCreateAcademyAnnouncement: () => idleMutation,
  useUpdateAcademyAnnouncement: () => idleMutation,
  usePublishAcademyAnnouncement: () => idleMutation,
  useArchiveAcademyAnnouncement: () => idleMutation,
}));

const { default: AcademyAnnouncementsPage } = await import(
  './pages/AcademyAnnouncementsPage'
);

afterEach(cleanup);

function renderPage(locale: 'en' | 'ar' = 'en') {
  const i18n = createI18nInstance(locale);
  return render(
    <I18nextProvider i18n={i18n}>
      <AcademyAnnouncementsPage />
    </I18nextProvider>,
  );
}

describe('AcademyAnnouncementsPage — controls follow the permission', () => {
  it('offers Create to a user holding announcement.manage', () => {
    hasPermission.mockImplementation((p) => p === 'announcement.manage');
    renderPage();

    expect(
      screen.getByRole('button', { name: /new announcement|create/i }),
    ).toBeTruthy();
  });

  it('offers edit and publish on a draft to a user holding announcement.manage', () => {
    hasPermission.mockImplementation((p) => p === 'announcement.manage');
    renderPage();

    const buttons = screen.getAllByRole('button').map((b) => b.textContent ?? '');
    expect(buttons.join('|').toLowerCase()).toMatch(/edit/);
    expect(buttons.join('|').toLowerCase()).toMatch(/publish/);
  });

  /*
   * An instructor holds `announcement.view` and not `announcement.manage`.
   * They may READ their academy's announcements — the route is guarded on
   * `view` for exactly that reason — but must be offered no authoring
   * control, because the backend would refuse every one of them.
   */
  it('offers no authoring control to a user holding only announcement.view', () => {
    hasPermission.mockImplementation((p) => p === 'announcement.view');
    renderPage();

    const labels = screen
      .queryAllByRole('button')
      .map((b) => (b.textContent ?? '').toLowerCase())
      .join('|');

    expect(labels).not.toMatch(/create|new announcement/);
    expect(labels).not.toMatch(/edit/);
    expect(labels).not.toMatch(/publish/);
    expect(labels).not.toMatch(/archive/);
  });

  it('still shows the announcement itself to a read-only user', () => {
    hasPermission.mockImplementation((p) => p === 'announcement.view');
    renderPage();

    expect(screen.getByText('Midterm timetable')).toBeTruthy();
  });

  it('renders the Arabic page without falling back to English', () => {
    hasPermission.mockImplementation((p) => p === 'announcement.manage');
    const { container } = renderPage('ar');

    expect(container.textContent ?? '').toMatch(/[ء-ي]/);
  });
});
