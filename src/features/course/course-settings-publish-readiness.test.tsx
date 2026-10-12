/**
 * B0-LRN-03 — Course Settings no longer offers "publish anyway": it shows
 * the same blocking checks as the wizard, links to the curriculum, and
 * keeps Publish disabled until the course is ready.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type { CoursePublishReadiness } from '@types';

let readiness: CoursePublishReadiness | undefined;

const mutation = { mutateAsync: vi.fn(), isPending: false };

vi.mock('./hooks', () => ({
  useCourse: () => ({
    data: {
      id: 'c-1',
      academyId: 'a-1',
      title: 'Course',
      status: 'draft',
      visibility: 'private',
    },
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCourseSections: () => ({ data: { items: [] } }),
  usePublishCourse: () => mutation,
  useUnpublishCourse: () => mutation,
  useDeleteCourse: () => mutation,
  usePublishReadiness: () => ({ data: readiness }),
}));
vi.mock('./components/CourseCompletionSettingsCard', () => ({
  CourseCompletionSettingsCard: () => null,
}));
vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAuth: () => ({ organization: { id: 'o-1', role: 'owner' } }),
}));
vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useConfirmDialog: () => ({ confirm: vi.fn() }),
}));

const { default: CourseSettingsPage } =
  await import('./pages/CourseSettingsPage');

function renderPage() {
  render(
    <AtlasLocalizationProvider initialLanguage="en">
      <MemoryRouter
        initialEntries={['/dashboard/academy/a-1/courses/c-1/settings']}
      >
        <Routes>
          <Route
            path="/dashboard/academy/:academyId/courses/:courseId/settings"
            element={<CourseSettingsPage />}
          />
        </Routes>
      </MemoryRouter>
    </AtlasLocalizationProvider>
  );
}

const check = (
  key: CoursePublishReadiness['checks'][number]['key'],
  status: 'pass' | 'fail'
) =>
  ({
    key,
    status,
    severity: 'blocking',
    step: 'curriculum',
  }) as CoursePublishReadiness['checks'][number];

afterEach(() => {
  cleanup();
  readiness = undefined;
});

describe('Course Settings — publish readiness', () => {
  it('lists the blockers, links to the curriculum and disables Publish', async () => {
    readiness = {
      courseId: 'c-1',
      ready: false,
      enforced: true,
      checks: [check('title', 'pass'), check('publishedActivity', 'fail')],
    } as unknown as CoursePublishReadiness;
    renderPage();
    const blockers = await screen.findByTestId('course-publish-blockers');
    expect(blockers.textContent).toContain(
      'Publish at least one lesson, quiz or assignment.'
    );
    expect(
      screen
        .getByRole('link', { name: 'Open the curriculum' })
        .getAttribute('href')
    ).toBe('/dashboard/academy/a-1/courses/c-1/builder');
    expect(
      (
        screen.getByRole('button', {
          name: 'Publish Course',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });

  it('enables Publish once the course is ready', async () => {
    readiness = {
      courseId: 'c-1',
      ready: true,
      enforced: true,
      checks: [check('publishedActivity', 'pass')],
    } as unknown as CoursePublishReadiness;
    renderPage();
    const publish = (await screen.findByRole('button', {
      name: 'Publish Course',
    })) as HTMLButtonElement;
    expect(publish.disabled).toBe(false);
    expect(screen.queryByTestId('course-publish-blockers')).toBeNull();
  });
});
