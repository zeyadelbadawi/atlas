/**
 * B4 review (CodeRabbit on #94):
 *   - a student dialog cannot be dismissed while its request runs: its
 *     failure shows only inside it;
 *   - an announcement keeps its stored (now past) time without refusal,
 *     while a NEW past time is still refused;
 *   - a postal code typed in Arabic-Indic digits is accepted.
 */
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { announcementSchemaFor } from '@/features/announcements/schemas/announcement.schemas';
import { updateAcademyProfileSchema } from './schemas/academy.schemas';

vi.mock('@app/providers', () => ({
  useConfirmDialog: () => ({ confirm: vi.fn().mockResolvedValue(true) }),
}));
vi.mock('@features/course', () => ({
  useCourses: () => ({
    data: { items: [{ id: 'c-1', title: 'Algebra' }] },
    isLoading: false,
  }),
}));

const { BlockStudentDialog, EnrollmentExpiryDialog } =
  await import('./components/AcademyStudentActionDialogs');

const I18N = createI18nInstance('en');
const wrap = (children: ReactNode) =>
  render(<I18nextProvider i18n={I18N}>{children}</I18nextProvider>);

afterEach(cleanup);

describe('student dialogs while a request runs', () => {
  it('Escape does not close the expiry dialog while pending', () => {
    const onOpenChange = vi.fn();
    wrap(
      <EnrollmentExpiryDialog
        open
        onOpenChange={onOpenChange}
        isPending
        courseTitle="Algebra"
        onConfirm={() => undefined}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Escape does not close the block dialog while pending', () => {
    const onOpenChange = vi.fn();
    wrap(
      <BlockStudentDialog
        open
        onOpenChange={onOpenChange}
        isPending
        studentName="Sara"
        onConfirm={() => undefined}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('Escape still closes the expiry dialog when nothing is pending', () => {
    const onOpenChange = vi.fn();
    wrap(
      <EnrollmentExpiryDialog
        open
        onOpenChange={onOpenChange}
        isPending={false}
        courseTitle="Algebra"
        onConfirm={() => undefined}
      />
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('announcement schedule when editing', () => {
  const past = '2020-01-01T10:00';
  const base = { title: 'Exam', body: 'Revise' };

  it('keeps the stored past time', () => {
    expect(
      announcementSchemaFor(past).safeParse({ ...base, scheduledAt: past })
        .success
    ).toBe(true);
  });

  it('still refuses a new past time', () => {
    expect(
      announcementSchemaFor(past).safeParse({
        ...base,
        scheduledAt: '2020-02-01T10:00',
      }).success
    ).toBe(false);
    expect(
      announcementSchemaFor().safeParse({ ...base, scheduledAt: past }).success
    ).toBe(false);
  });
});

describe('postal code digits', () => {
  it('accepts Arabic-Indic digits and still refuses symbols', () => {
    const field = updateAcademyProfileSchema.shape.postalCode;
    expect(field.safeParse('١١٥١١').success).toBe(true);
    expect(field.safeParse('11511').success).toBe(true);
    expect(field.safeParse('ABC-!!-9').success).toBe(false);
  });
});
