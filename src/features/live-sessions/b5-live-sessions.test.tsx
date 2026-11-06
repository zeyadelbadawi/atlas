/**
 * B5 (UX audit) — live sessions and the add-on store.
 *
 *  V02  Disable / Uninstall ask first and say what is lost (and that a
 *       paid add-on must be bought again).
 *  V14  a start in the past is refused (an unchanged start, when editing,
 *       is not).
 *  V15  closing the form with typed changes asks first.
 *  V16  the server's schedule refusals land on the start/end fields; any
 *       other failure is one inline alert.
 *  V17  rows say date, time and length.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { createApiError } from '@api';
import { createLiveSessionFormSchema } from './schemas/liveSession.schemas';
import {
  LiveSessionFormDialog,
  withLiveSessionWording,
} from './components/LiveSessionFormDialog';
import { sessionMinutes } from './components/LiveSessionCurriculumBlock';
import { addOnLossText } from './pages/AddOnsCatalogPage';
import type { AddOnCatalogEntry, LanguageCode, LiveSession } from '@types';

// jsdom has no ResizeObserver; the Radix Switch measures itself with one.
globalThis.ResizeObserver ??= class {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
} as unknown as typeof ResizeObserver;

afterEach(cleanup);

const NOW = new Date('2026-11-06T10:00:00').getTime();
const base = {
  title: 'Revision',
  description: '',
  recordingEnabled: false,
};

function issues(
  values: { scheduledStartAt: string; scheduledEndAt: string },
  originalStart?: string
) {
  const result = createLiveSessionFormSchema({
    now: () => NOW,
    originalStart,
  }).safeParse({ ...base, ...values });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [
          String(issue.path[0]),
          issue.message,
        ])
      );
}

describe('V14 — a start in the past', () => {
  it('is refused on the start field', () => {
    expect(
      issues({
        scheduledStartAt: '2026-11-03T10:00',
        scheduledEndAt: '2026-11-03T11:00',
      })
    ).toEqual({ scheduledStartAt: 'liveSessions:validation.startInPast' });
  });

  it('is accepted within the minute the server allows, and in the future', () => {
    expect(
      issues({
        scheduledStartAt: '2026-11-06T10:00',
        scheduledEndAt: '2026-11-06T11:00',
      })
    ).toEqual({});
    expect(
      issues({
        scheduledStartAt: '2026-11-07T10:00',
        scheduledEndAt: '2026-11-07T11:00',
      })
    ).toEqual({});
  });

  it('is not refused for an unchanged start when editing', () => {
    expect(
      issues(
        {
          scheduledStartAt: '2026-11-03T10:00',
          scheduledEndAt: '2026-11-03T11:00',
        },
        '2026-11-03T10:00'
      )
    ).toEqual({});
  });

  it('has the message in both languages', () => {
    expect(
      createI18nInstance('en').t('liveSessions:validation.startInPast')
    ).toBe('This time has already passed. Choose a start time in the future.');
    expect(
      createI18nInstance('ar').t('liveSessions:validation.startInPast')
    ).toBe('هذا الوقت مضى بالفعل. اختر وقت بدء في المستقبل.');
  });
});

function renderDialog(
  props: Partial<Parameters<typeof LiveSessionFormDialog>[0]> = {},
  language: LanguageCode = 'en'
) {
  const onOpenChange = vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <AtlasDialogProvider>
        <LiveSessionFormDialog
          open
          onOpenChange={onOpenChange}
          mode="create"
          isPending={false}
          onSubmit={vi.fn()}
          {...props}
        />
      </AtlasDialogProvider>
    </I18nextProvider>
  );
  return { onOpenChange };
}

describe('V16 — server refusals in the form', () => {
  it('puts the backend past-start violation on the start field in this form’s words', async () => {
    renderDialog({
      error: createApiError('validation', {
        status: 400,
        messageKey: 'errors.liveSessions.startInPast',
        violations: [
          {
            field: 'scheduledStartAt',
            messageKey: 'validation:scheduleInPast',
          },
        ],
      }),
    });
    expect(
      await screen.findByText(
        'This time has already passed. Choose a start time in the future.'
      )
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('puts a duration refusal on the end field, with its numbers', async () => {
    renderDialog({
      error: createApiError('validation', {
        status: 400,
        messageKey: 'errors.liveSessions.invalidDuration',
        violations: [
          {
            field: 'scheduledEndAt',
            messageKey: 'errors.liveSessions.invalidDuration',
            values: { minMinutes: 5, maxMinutes: 720 },
          },
        ],
      }),
    });
    expect(
      await screen.findByText(
        'A session must be between 5 minutes and 720 minutes long.'
      )
    ).toBeTruthy();
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('shows any other failure once, inline', () => {
    renderDialog({
      error: createApiError('forbidden', {
        status: 403,
        messageKey: 'errors.liveSessions.addOnNotUsable',
      }),
    });
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("The session wasn't added");
    expect(alert.textContent).toContain(
      "Live Sessions isn't available right now."
    );
  });

  it('keeps every other violation untouched', () => {
    const error = createApiError('validation', {
      violations: [{ field: 'title', messageKey: 'validation:required' }],
    });
    expect(withLiveSessionWording(error)).toBe(error);
  });
});

describe('V15 — closing with typed changes', () => {
  it('asks before discarding', async () => {
    const { onOpenChange } = renderDialog();
    fireEvent.change(
      screen.getByPlaceholderText('e.g. Unit 1 revision class'),
      {
        target: { value: 'Unit 2 recap' },
      }
    );
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(await screen.findByRole('alertdialog')).toBeTruthy();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('marks the required fields and states the limits', () => {
    renderDialog();
    expect(screen.getAllByText('This field is required').length).toBe(3);
    expect(screen.getByText('0 / 200 characters')).toBeTruthy();
    expect(screen.getByText('0 / 2000 characters')).toBeTruthy();
  });
});

describe('V17 / V02 — rows and the add-on store', () => {
  it('computes a session’s length in minutes', () => {
    expect(
      sessionMinutes({
        scheduledStartAt: '2026-11-07T10:00:00Z',
        scheduledEndAt: '2026-11-07T11:30:00Z',
      } as LiveSession)
    ).toBe(90);
    const i18n = createI18nInstance('en');
    expect(
      i18n.t('liveSessions:row.duration', { count: 90, formatted: '90' })
    ).toBe('90 minutes');
  });

  it('says what turning an add-on off takes away', () => {
    const t = createI18nInstance('en').t;
    const extra = {
      key: 'extra-academy',
      effect: { type: 'limit', limitKey: 'academies', amount: 2 },
    } as unknown as AddOnCatalogEntry;
    expect(addOnLossText(t, extra)).toBe(
      "Your limit for Academies goes down by 2. What you already have stays, but you can't add more while you're over the limit."
    );
    const live = {
      key: 'live-sessions',
      effect: { type: 'feature', featureKey: 'liveSessions' },
    } as unknown as AddOnCatalogEntry;
    expect(addOnLossText(t, live)).toBe('New live sessions can’t be created.');
    expect(
      t('liveSessions:catalog.confirm.uninstallDescription', {
        loss: addOnLossText(t, extra),
        rebuy: t('liveSessions:catalog.confirm.rebuy'),
      })
    ).toContain(
      'to use it again you’ll need to buy it again'.replace('’', "'")
    );
  });
});
