/**
 * B3 (UX audit) — the course forms say what is wrong, once, in the page's
 * language. Real EN/AR catalogues; the course service is the only fake.
 *
 *   V02/V14  price: sub-unit precision, exponent, maximum; "12,50" = 12.50
 *   V07/V12  a server `pricing.amount` violation lands on Price, labelled
 *   V05      a failed save shows ONE inline message, no toast, and the
 *            app-wide reporter stays quiet
 *   V03      a too-long outcome line is named by number (EN + AR)
 *   V13      a taken web address shows on the slug field
 *   V22/V11/V30  lesson link: http(s) only, LTR, no browser bubble, per type
 *   V20      counters on long text
 *   V28      the phone stepper says why the steps are locked
 *   V16      the delete copy says the course is archived
 */
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import { QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { createQueryClient } from '@services/query/query-client';
import { ToastContext } from '@app/providers/toast/toast.context';
import type { ToastContextValue } from '@app/providers/toast/toast.context';
import { AtlasDialogProvider } from '@app/providers/dialog/DialogProvider';
import { UnsavedChangesProvider } from '@features/unsaved-changes';
import { createApiError } from '@/services/api/api-error';
import type { ApiError } from '@/services/api/api-error';
import { toast } from '@/hooks/use-toast';
import type { Course } from '@types';
import { courseService } from './services/CourseService';
import { PricingStep } from './wizard/PricingStep';
import { DetailsStep } from './wizard/DetailsStep';
import { BasicsStep } from './wizard/BasicsStep';
import { CourseWizardStepper } from './wizard/CourseWizardStepper';
import { deriveCourseWizardStepStates } from './wizard/course-wizard.steps';
import { LessonFormDialog } from './components/LessonFormDialog';
import en from '@/localization/resources/en/course.json';
import ar from '@/localization/resources/ar/course.json';

vi.mock('@/shared/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' }, organization: { id: 'org-1' } }),
}));
vi.mock('@/hooks/use-toast', () => ({ toast: vi.fn(), useToast: () => ({}) }));
vi.mock('./hooks/useAcademyPriceCurrency', () => ({
  useAcademyPriceCurrency: () => 'EGP',
  usePriceCurrencyDefault: () => undefined,
}));

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

const toastValue: ToastContextValue = {
  notify: vi.fn(),
  notifySuccess: vi.fn(),
  notifyError: vi.fn(),
  dismissAll: vi.fn(),
};

const COURSE: Course = {
  id: 'c1',
  academyId: 'aca-1',
  title: 'Arabic 101',
  slug: 'arabic-101',
  status: 'draft',
  visibility: 'private',
  pricing: { type: 'paid', amount: 100, currency: 'EGP' },
  instructors: [],
  stats: { totalSections: 0, totalLessons: 0 },
  createdAt: '2026-10-01T00:00:00Z',
  updatedAt: '2026-10-01T00:00:00Z',
};

const I18N = { en: createI18nInstance('en'), ar: createI18nInstance('ar') };

let updateCourse: MockInstance<typeof courseService.updateCourse>;
let reported: ReturnType<typeof vi.fn>;

beforeEach(() => {
  updateCourse = vi
    .spyOn(courseService, 'updateCourse')
    .mockImplementation(
      async (_a, _c, payload) => ({ ...COURSE, ...payload }) as Course
    );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.mocked(toast).mockReset();
});

function renderWith(ui: ReactNode, language: 'en' | 'ar' = 'en') {
  reported = vi.fn();
  // The app's real client, with a spy as the app-wide error reporter.
  const client = createQueryClient(reported);
  client.setDefaultOptions({
    queries: { retry: false },
    mutations: { retry: false },
  });
  return render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={I18N[language]}>
        <ToastContext.Provider value={toastValue}>
          <AtlasDialogProvider>
            <UnsavedChangesProvider>
              <MemoryRouter>
                <div dir={language === 'ar' ? 'rtl' : 'ltr'}>{ui}</div>
              </MemoryRouter>
            </UnsavedChangesProvider>
          </AtlasDialogProvider>
        </ToastContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

const stepProps = {
  academyId: 'aca-1',
  course: COURSE,
  onNext: vi.fn(),
  goToStep: vi.fn(),
};

async function typePrice(value: string, language: 'en' | 'ar' = 'en') {
  const user = userEvent.setup();
  const price = screen.getByLabelText(language === 'ar' ? /^السعر/ : /^Price/);
  await user.clear(price);
  await user.type(price, value);
  await user.click(
    screen.getByRole('button', {
      name: language === 'ar' ? /حفظ ومتابعة/ : /Save and continue/,
    })
  );
  return price;
}

describe('Pricing step — the price (V02/V14)', () => {
  it.each([
    ['0.001', 'Use at most 2 decimal places, like 12.50.'],
    ['1e3', en.validation.priceFormat],
    [
      '2000000',
      'The highest price you can set is 1,000,000. Enter a lower amount.',
    ],
    ['0.00', en.validation.priceRequired],
  ])('refuses %j on the step with a message', async (value, message) => {
    renderWith(<PricingStep {...stepProps} />);
    await typePrice(value);
    expect(await screen.findByText(message)).toBeTruthy();
    expect(updateCourse).not.toHaveBeenCalled();
    expect(stepProps.onNext).not.toHaveBeenCalled();
  });

  it('reads "12,50" as 12.50, never 1,250', async () => {
    renderWith(<PricingStep {...stepProps} />);
    await typePrice('12,50');
    await waitFor(() => expect(updateCourse).toHaveBeenCalled());
    expect(updateCourse.mock.calls[0][2]).toMatchObject({
      pricing: { type: 'paid', amount: 12.5, currency: 'EGP' },
    });
  });

  it('says it in Arabic too', async () => {
    renderWith(<PricingStep {...stepProps} />, 'ar');
    await typePrice('0.001', 'ar');
    expect(await screen.findByText(ar.validation.priceDecimals)).toBeTruthy();
  });

  it('is a text field with a decimal keyboard, left to right, marked required', () => {
    renderWith(<PricingStep {...stepProps} />);
    const price = screen.getByLabelText(/^Price/) as HTMLInputElement;
    expect(price.type).toBe('text');
    expect(price.inputMode).toBe('decimal');
    expect(price.getAttribute('dir')).toBe('ltr');
    expect(price.getAttribute('aria-required')).toBe('true');
  });
});

describe('Pricing step — server failures (V07/V12/V05)', () => {
  it('a `pricing.amount` violation lands on Price, named in Arabic', async () => {
    updateCourse.mockRejectedValueOnce(
      createApiError('validation', {
        status: 400,
        violations: [
          {
            field: 'pricing.amount',
            messageKey: 'validation:max',
            values: { max: 100 },
          },
        ],
      })
    );
    renderWith(<PricingStep {...stepProps} />, 'ar');
    const price = await typePrice('150', 'ar');
    expect(
      await screen.findByText('يجب أن يكون السعر 100 أو أقل')
    ).toBeTruthy();
    expect(price.getAttribute('aria-invalid')).toBe('true');
    expect(stepProps.onNext).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
    expect(reported).not.toHaveBeenCalled();
  });

  it('a 500 is ONE inline message with the reason, no toast, reporter quiet', async () => {
    updateCourse.mockRejectedValueOnce(
      createApiError('server', { status: 500 })
    );
    renderWith(<PricingStep {...stepProps} />);
    await typePrice('150');
    const alert = await screen.findByTestId('save-failed');
    expect(
      within(alert).getByRole('button', { name: /try again/i })
    ).toBeTruthy();
    expect(toast).not.toHaveBeenCalled();
    expect(reported).not.toHaveBeenCalled();
    expect(screen.getAllByTestId('save-failed')).toHaveLength(1);
  });
});

describe('Details step — lists and counters (V03/V20)', () => {
  it.each([
    [
      'en',
      'Line 2 is 320 characters long. Keep each line to 300 characters or fewer.',
    ],
    [
      'ar',
      'عدد أحرف السطر 2 هو 320، والحد الأقصى لكل سطر 300. اختصره للمتابعة.',
    ],
  ] as const)(
    'names the too-long outcome line (%s)',
    async (language, message) => {
      const user = userEvent.setup();
      renderWith(<DetailsStep {...stepProps} />, language);
      const outcomes = screen.getByLabelText(
        language === 'ar'
          ? /^ما سيحققه المتعلمون/
          : /^What learners will achieve/
      );
      await user.click(outcomes);
      await user.paste(`Short line\n${'x'.repeat(320)}`);
      await user.click(
        screen.getByRole('button', {
          name: language === 'ar' ? /حفظ ومتابعة/ : /Save and continue/,
        })
      );
      expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
      expect(screen.queryByText(/maxItems/)).toBeNull();
      expect(updateCourse).not.toHaveBeenCalled();
    }
  );

  it('shows the description counter against 5000', () => {
    renderWith(<DetailsStep {...stepProps} />);
    expect(
      screen.getByTestId('course-description-count').textContent
    ).toContain('0 / 5000');
  });
});

describe('Basics — a taken web address (V13)', () => {
  it('is shown on the slug field, not only in a toast', async () => {
    updateCourse.mockRejectedValueOnce(
      createApiError('conflict', {
        status: 409,
        messageKey: 'errors.course.slugTaken',
      })
    );
    const user = userEvent.setup();
    renderWith(<BasicsStep academyId="aca-1" course={COURSE} />);
    const slug = screen.getByLabelText(/^Course Slug/);
    await user.clear(slug);
    await user.type(slug, 'taken-course');
    await user.click(screen.getByRole('button', { name: /Save and continue/ }));
    expect(
      await screen.findByText(/already used by another course/)
    ).toBeTruthy();
    expect(slug.getAttribute('aria-invalid')).toBe('true');
    expect(screen.queryByTestId('save-failed')).toBeNull();
    expect(toast).not.toHaveBeenCalled();
    expect(reported).not.toHaveBeenCalled();
  });
});

describe('Lesson dialog — the content link (V22/V11/V30/V20)', () => {
  function renderDialog(onSubmit = vi.fn(), language: 'en' | 'ar' = 'en') {
    renderWith(
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        isPending={false}
        onSubmit={onSubmit}
      />,
      language
    );
    return onSubmit;
  }

  it('refuses a javascript: link with the app message, not a browser bubble', async () => {
    const user = userEvent.setup();
    const onSubmit = renderDialog();
    await user.type(screen.getByLabelText(/^Lesson Title/), 'Intro');
    const url = screen.getByLabelText(/^Content URL/);
    expect(url.getAttribute('dir')).toBe('ltr');
    expect(url.closest('form')?.noValidate).toBe(true);
    await user.type(url, 'javascript:alert(1)');
    await user.click(screen.getByRole('button', { name: 'Save Lesson' }));
    expect(
      await screen.findByText(en.builder.lessonDialog.invalidContentUrl)
    ).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('switching Video → File does not carry the video link along', async () => {
    const user = userEvent.setup();
    renderDialog();
    const url = screen.getByLabelText(/^Content URL/) as HTMLInputElement;
    await user.type(url, 'https://youtu.be/abc');
    Element.prototype.scrollIntoView ??= () => undefined;
    const trigger = within(screen.getByRole('dialog')).getAllByRole(
      'combobox'
    )[0];
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    const file = await screen.findByRole('option', { name: 'File' });
    fireEvent.keyDown(file, { key: 'Enter' });
    await waitFor(() => expect(trigger.textContent).toBe('File'));
    await waitFor(() =>
      expect(
        (screen.queryByLabelText(/^Content URL/) as HTMLInputElement | null)
          ?.value ?? ''
      ).toBe('')
    );
  });

  it('counts the description against 2000', () => {
    renderDialog();
    expect(
      screen.getByTestId('lesson-description-count').textContent
    ).toContain('0 / 2000');
  });

  it('a non-field failure is one alert inside the dialog (V05)', async () => {
    const user = userEvent.setup();
    function Harness(): JSX.Element {
      const [error, setError] = useState<ApiError | null>(null);
      return (
        <LessonFormDialog
          open
          onOpenChange={vi.fn()}
          mode="create"
          isPending={false}
          error={error}
          onSubmit={async () => {
            setError(createApiError('server', { status: 500 }));
          }}
        />
      );
    }
    renderWith(<Harness />);
    expect(screen.queryByTestId('save-failed')).toBeNull();
    await user.type(screen.getByLabelText(/^Lesson Title/), 'Intro');
    await user.click(screen.getByRole('button', { name: 'Save Lesson' }));
    expect(await screen.findAllByTestId('save-failed')).toHaveLength(1);
    expect(toast).not.toHaveBeenCalled();
  });
});

describe('Wizard stepper on a phone (V28/V24)', () => {
  it('says why the steps are locked before the course exists', () => {
    renderWith(
      <CourseWizardStepper
        current="basics"
        states={deriveCourseWizardStepStates(undefined, undefined)}
        onSelect={vi.fn()}
        lockedSteps={['details', 'media', 'pricing']}
      />
    );
    expect(screen.getByTestId('wizard-locked-note').textContent).toBe(
      en.wizard.lockedNote
    );
  });

  it('a new free course shows Pricing as Optional, not Completed', () => {
    renderWith(
      <CourseWizardStepper
        current="details"
        states={deriveCourseWizardStepStates(
          { ...COURSE, pricing: { type: 'free' } },
          undefined
        )}
        onSelect={vi.fn()}
      />
    );
    expect(
      screen.getByRole('button', { name: '6. Pricing, Optional' })
    ).toBeTruthy();
  });
});

describe('Delete copy tells the truth (V16)', () => {
  it.each([
    ['en', en],
    ['ar', ar],
  ] as const)(
    '%s: says the course is archived and where to find it',
    (_l, copy) => {
      const { title, description, confirmLabel } =
        copy.settings.deleteCourseConfirm;
      const all = `${title} ${description} ${confirmLabel} ${copy.settings.dangerZoneDescription}`;
      expect(all).not.toMatch(
        /permanent|cannot be undone|نهائي|لا يمكن التراجع/
      );
      expect(all).toMatch(/archiv|أرشف|مؤرشفة/i);
    }
  );
});
