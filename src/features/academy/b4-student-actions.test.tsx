/**
 * B4 (UX audit) — the student drawer's dialogs: access expiry in the past
 * (V06), block reason limit (V18), Enroll never greyed without a reason
 * (V29), and one message with the real reason for any failure (V09).
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { createApiError } from '@api';
import { isPastDateInput, todayDateInput } from './utils/academy-roster.utils';

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({
    data: { items: [{ id: 'c-1', title: 'Algebra' }] },
    isLoading: false,
  }),
}));

const {
  BlockStudentDialog,
  EnrollStudentDialog,
  EnrollmentExpiryDialog,
} = await import('./components/AcademyStudentActionDialogs');

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

function wrap(children: ReactNode, language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={I18N[language]}>{children}</I18nextProvider>
  );
}

const noop = () => undefined;

afterEach(cleanup);

describe('past dates (V06)', () => {
  it('today is allowed, yesterday is not', () => {
    const now = new Date(2026, 10, 6, 12);
    expect(isPastDateInput(todayDateInput(now), now)).toBe(false);
    expect(isPastDateInput('2026-11-05', now)).toBe(true);
    expect(isPastDateInput('', now)).toBe(false);
  });

  it('Set expiry refuses 2020-01-01 with a message, and sends nothing', () => {
    const onConfirm = vi.fn();
    wrap(
      <EnrollmentExpiryDialog
        open
        onOpenChange={noop}
        isPending={false}
        courseTitle="Algebra"
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByLabelText('Expires on'), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(screen.getByTestId('expiry-confirm'));
    expect(
      screen.getByText(
        'Choose today or a later date. A date in the past would end their access straight away.'
      )
    ).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('shows the server refusal (expiryInPast) on the date field, not as a generic failure', () => {
    wrap(
      <EnrollmentExpiryDialog
        open
        onOpenChange={noop}
        isPending={false}
        courseTitle="Algebra"
        onConfirm={noop}
        error={createApiError('validation', {
          messageKey: 'errors.enrollment.expiryInPast',
        })}
      />
    );
    expect(screen.getByRole('alert').textContent).toMatch(
      /Choose today or a later date/
    );
    expect(screen.queryByTestId('save-failed')).toBeNull();
  });

  it('an empty date says what to do instead of a greyed Save (Arabic)', () => {
    wrap(
      <EnrollmentExpiryDialog
        open
        onOpenChange={noop}
        isPending={false}
        courseTitle="Algebra"
        onConfirm={noop}
      />,
      'ar'
    );
    const save = screen.getByTestId('expiry-confirm') as HTMLButtonElement;
    expect(save.disabled).toBe(false);
    fireEvent.click(save);
    expect(screen.getByRole('alert').textContent).toContain(
      'اختر يوم انتهاء الوصول'
    );
  });

  it('Enroll refuses a past expiry too', () => {
    const onConfirm = vi.fn();
    wrap(
      <EnrollStudentDialog
        open
        onOpenChange={noop}
        isPending={false}
        academyId="a-1"
        studentName="Mona"
        enrolledCourseIds={[]}
        onConfirm={onConfirm}
      />
    );
    fireEvent.change(screen.getByLabelText('Access expires (optional)'), {
      target: { value: '2020-01-01' },
    });
    fireEvent.click(screen.getByTestId('enroll-confirm'));
    expect(
      screen.getAllByText(/Choose today or a later date/).length
    ).toBeGreaterThan(0);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('Enroll without a course (V29)', () => {
  it('is pressable and says to choose a course', () => {
    const onConfirm = vi.fn();
    wrap(
      <EnrollStudentDialog
        open
        onOpenChange={noop}
        isPending={false}
        academyId="a-1"
        studentName="Mona"
        enrolledCourseIds={[]}
        onConfirm={onConfirm}
      />
    );
    const enroll = screen.getByTestId('enroll-confirm') as HTMLButtonElement;
    expect(enroll.disabled).toBe(false);
    fireEvent.click(enroll);
    expect(
      screen.getByText('Choose the course to enroll them in.')
    ).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe('Block reason (V18)', () => {
  it('shows a counter with the 500 limit and refuses 800 characters', () => {
    const onConfirm = vi.fn();
    wrap(
      <BlockStudentDialog
        open
        onOpenChange={noop}
        isPending={false}
        studentName="Mona"
        onConfirm={onConfirm}
      />
    );
    expect(screen.getByText('0 / 500 characters')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('Reason (optional)'), {
      target: { value: 'x'.repeat(800) },
    });
    expect(screen.getByText('800 / 500 characters')).toBeTruthy();
    fireEvent.click(screen.getByTestId('block-confirm'));
    expect(
      screen.getByText('Keep the reason to 500 characters or fewer.')
    ).toBeTruthy();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('a failure is one inline message with the real reason', () => {
    wrap(
      <BlockStudentDialog
        open
        onOpenChange={noop}
        isPending={false}
        studentName="Mona"
        onConfirm={noop}
        error={createApiError('server')}
      />
    );
    const alert = screen.getByTestId('save-failed');
    expect(alert.textContent).toContain("The student wasn't blocked");
    expect(alert.textContent).toContain('Something failed on our side');
    expect(alert.textContent).not.toContain('That action could not be completed');
  });

  it('a roster refusal keeps its own words', () => {
    wrap(
      <BlockStudentDialog
        open
        onOpenChange={noop}
        isPending={false}
        studentName="Mona"
        onConfirm={noop}
        error={createApiError('forbidden', {
          messageKey: 'errors.academy.insufficientRole',
        })}
      />,
      'ar'
    );
    expect(screen.getByTestId('save-failed').textContent).toContain(
      'لم يتم حظر الطالب'
    );
  });
});
