/**
 * B4 (UX audit) — announcements:
 *   V05 a schedule in the past is refused, on the field (client and server);
 *   V15 Escape with typed work asks first;
 *   V16 "Scheduled" says when; a draft or scheduled one can be archived;
 *   V09 a save failure is ONE alert in the dialog; publish/archive failures
 *       are ONE toast with the real reason.
 */
import type { ReactNode } from 'react';
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
import { createApiError } from '@api';
import type { ApiError } from '@api';
import type { Announcement } from '@types';
import { isScheduleInPast } from './schemas/announcement.schemas';

const state = vi.hoisted(() => ({
  confirm: vi.fn(),
  notifyError: vi.fn(),
  notifySuccess: vi.fn(),
}));

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useUnsavedChanges: () => ({ markSaved: () => undefined }),
}));
vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: state.confirm }),
  useToast: () => ({
    notifySuccess: state.notifySuccess,
    notifyError: state.notifyError,
    notify: vi.fn(),
    dismissAll: vi.fn(),
  }),
}));

const { AnnouncementManagerPanel } =
  await import('./components/AnnouncementManagerPanel');

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function toLocalInput(date: Date): string {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function item(overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: 'a1',
    audience: 'academy',
    academyId: 'academy-1',
    authorId: 'u1',
    authorName: 'Owner',
    title: 'Exam next week',
    body: 'Revise chapter 3.',
    status: 'draft',
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
    ...overrides,
  };
}

interface Options {
  readonly announcements?: Announcement[];
  readonly onCreate?: () => Promise<unknown>;
  readonly onPublish?: () => Promise<unknown>;
  readonly onArchive?: () => Promise<unknown>;
  readonly saveError?: ApiError | null;
  readonly isCreateOpen?: boolean;
  readonly language?: 'en' | 'ar';
}

function panel(options: Options = {}): ReactNode {
  return (
    <I18nextProvider i18n={I18N[options.language ?? 'en']}>
      <AnnouncementManagerPanel
        announcements={options.announcements ?? []}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        canManage
        emptyTitleKey="announcements:academy.empty"
        emptyDescriptionKey="announcements:academy.emptyDescription"
        onCreate={options.onCreate ?? vi.fn().mockResolvedValue(undefined)}
        onUpdate={vi.fn().mockResolvedValue(undefined)}
        onPublish={options.onPublish ?? vi.fn().mockResolvedValue(undefined)}
        onArchive={options.onArchive ?? vi.fn().mockResolvedValue(undefined)}
        isSaving={false}
        saveError={options.saveError ?? null}
        isCreateOpen={options.isCreateOpen ?? false}
        onCreateOpenChange={vi.fn()}
      />
    </I18nextProvider>
  );
}

function fill(title: string, body: string, scheduledAt?: string) {
  fireEvent.change(screen.getByLabelText('Title'), {
    target: { value: title },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: body },
  });
  if (scheduledAt !== undefined) {
    fireEvent.change(screen.getByLabelText(/Schedule for/), {
      target: { value: scheduledAt },
    });
  }
}

afterEach(() => {
  cleanup();
  state.confirm.mockReset();
  state.notifyError.mockReset();
  state.notifySuccess.mockReset();
});

describe('schedule in the past (V05)', () => {
  it('the rule allows a minute for typing', () => {
    const now = new Date('2026-11-06T10:00:00Z');
    expect(
      isScheduleInPast(toLocalInput(new Date('2026-11-03T10:00:00Z')), now)
    ).toBe(true);
    expect(
      isScheduleInPast(toLocalInput(new Date('2026-11-07T10:00:00Z')), now)
    ).toBe(false);
  });

  it('refuses a time three days ago, with a message, and sends nothing', async () => {
    const onCreate = vi.fn();
    render(panel({ isCreateOpen: true, onCreate }));
    fill(
      'Exam',
      'Bring a pen.',
      toLocalInput(new Date(Date.now() - 3 * 86_400_000))
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByText(
        'Choose a time in the future, or leave it empty to save a draft.'
      )
    ).toBeTruthy();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it('puts the server refusal on the schedule field (Arabic)', async () => {
    const error = createApiError('validation', {
      messageKey: 'errors.announcement.scheduleInPast',
      violations: [
        { field: 'scheduledAt', messageKey: 'validation:scheduleInPast' },
      ],
    });
    const onCreate = vi.fn().mockRejectedValue(error);
    const view = render(
      panel({ isCreateOpen: true, onCreate, language: 'ar' })
    );
    fireEvent.change(screen.getByLabelText('العنوان'), {
      target: { value: 'امتحان' },
    });
    fireEvent.change(screen.getByLabelText('الرسالة'), {
      target: { value: 'أحضر قلمًا.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ' }));
    await waitFor(() => expect(onCreate).toHaveBeenCalled());
    view.rerender(
      panel({ isCreateOpen: true, onCreate, saveError: error, language: 'ar' })
    );
    expect(
      await screen.findByText(
        'اختر وقتًا في المستقبل، أو اتركه فارغًا لحفظ مسودة.'
      )
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(state.notifyError).not.toHaveBeenCalled();
  });
});

describe('failures (V09)', () => {
  it('a failed save is one alert inside the dialog with the real reason', async () => {
    const onCreate = vi.fn().mockRejectedValue(createApiError('network'));
    render(panel({ isCreateOpen: true, onCreate }));
    fill('Exam', 'Bring a pen.');
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const alert = await screen.findByTestId('save-failed');
    expect(alert.textContent).toContain("The announcement wasn't saved");
    expect(alert.textContent).toContain('Check your connection');
    expect(state.notifyError).not.toHaveBeenCalled();
  });

  it('a failed publish is ONE toast with the real reason', async () => {
    state.confirm.mockResolvedValue(true);
    const onPublish = vi.fn().mockRejectedValue(createApiError('server'));
    render(panel({ announcements: [item()], onPublish }));
    fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(state.notifyError).toHaveBeenCalledTimes(1));
    expect(state.notifyError).toHaveBeenCalledWith(
      'announcements:manage.publishFailedTitle',
      'errors:server.description'
    );
  });
});

describe('closing with typed work (V15)', () => {
  it('Escape asks first and keeps the text when the owner stays', async () => {
    state.confirm.mockResolvedValue(false);
    render(panel({ isCreateOpen: true }));
    fill('Exam', 'Bring a pen.');
    fireEvent.keyDown(screen.getByLabelText('Title'), { key: 'Escape' });
    await waitFor(() => expect(state.confirm).toHaveBeenCalled());
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe(
      'Exam'
    );
  });
});

describe('the list (V16)', () => {
  it('says when a scheduled announcement goes out', () => {
    render(
      panel({
        announcements: [
          item({
            status: 'scheduled',
            scheduledAt: '2026-12-01T09:00:00.000Z',
          }),
        ],
      })
    );
    expect(
      screen.getByTestId('announcement-scheduled-for').textContent
    ).toMatch(/^Scheduled for /);
  });

  it('offers Archive on a draft, with a confirmation that it will not be published', async () => {
    state.confirm.mockResolvedValue(true);
    const onArchive = vi.fn().mockResolvedValue(undefined);
    render(panel({ announcements: [item()], onArchive }));
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));
    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('a1'));
    expect(state.confirm.mock.calls[0][0].descriptionKey).toBe(
      'announcements:manage.archiveDraftDialog.description'
    );
  });
});
