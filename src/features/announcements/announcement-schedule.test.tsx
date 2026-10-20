/**
 * Editing an announcement's schedule.
 *
 * The server schedules a draft when a date is added and puts a scheduled
 * announcement back to draft when the date is cleared — but only if it is
 * told: an emptied date field must be sent as `null` (omitting it means
 * "leave the schedule alone"). And the stored UTC instant must show in the
 * date field as LOCAL time, or every save would move the schedule by the
 * viewer's UTC offset.
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
import type { Announcement } from '@types';

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUnsavedChanges: () => undefined,
}));

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: async () => true }),
}));

const { AnnouncementManagerPanel } =
  await import('./components/AnnouncementManagerPanel');

const SCHEDULED_AT = '2026-11-02T08:30:00.000Z';

function renderPanel(announcement: Announcement) {
  const onUpdate = vi.fn().mockResolvedValue(undefined);
  render(
    <I18nextProvider i18n={createI18nInstance('en')}>
      <AnnouncementManagerPanel
        announcements={[announcement]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        canManage
        emptyTitleKey="announcements:academy.empty"
        emptyDescriptionKey="announcements:academy.emptyDescription"
        onCreate={vi.fn()}
        onUpdate={onUpdate}
        onPublish={vi.fn()}
        onArchive={vi.fn()}
        isSaving={false}
        saveError={null}
        isCreateOpen={false}
        onCreateOpenChange={vi.fn()}
      />
    </I18nextProvider>
  );
  return { onUpdate };
}

function announcement(overrides: Partial<Announcement>): Announcement {
  return {
    id: 'a1',
    audience: 'academy',
    academyId: 'academy-1',
    authorId: 'u1',
    authorName: 'Example Owner',
    title: 'Exam next week',
    body: 'Revise chapter 3.',
    status: 'draft',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

const scheduleInput = () =>
  screen.getByLabelText(/Schedule for/) as HTMLInputElement;

afterEach(cleanup);

describe('announcement schedule editing', () => {
  it('shows the stored time in local time and saves it back unchanged', async () => {
    const { onUpdate } = renderPanel(
      announcement({ status: 'scheduled', scheduledAt: SCHEDULED_AT })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    const date = new Date(SCHEDULED_AT);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    await waitFor(() => expect(scheduleInput().value).toBe(local));

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('a1', {
        title: 'Exam next week',
        body: 'Revise chapter 3.',
        scheduledAt: SCHEDULED_AT,
      })
    );
  });

  it('sends null when the date is cleared, so the server unschedules it', async () => {
    const { onUpdate } = renderPanel(
      announcement({ status: 'scheduled', scheduledAt: SCHEDULED_AT })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await waitFor(() => expect(scheduleInput().value).not.toBe(''));

    fireEvent.change(scheduleInput(), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith('a1', {
        title: 'Exam next week',
        body: 'Revise chapter 3.',
        scheduledAt: null,
      })
    );
  });

  it('explains what a date does', () => {
    renderPanel(announcement({}));
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(
      screen.getByText(/published automatically within about 15 minutes/)
    ).toBeTruthy();
  });
});
