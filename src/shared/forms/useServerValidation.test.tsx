/**
 * A server field error lands on the form field that edits it — including
 * when the form holds the value under another name (the quiz form's
 * `timeLimitMinutes` for the API's `timeLimitSeconds`), so a refused
 * setting is never a silent failure.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { ApiError } from '@api';
import en from '@/localization/resources/en/errors.json';
import ar from '@/localization/resources/ar/errors.json';
import { useServerValidation } from './useServerValidation';

interface QuizLikeForm {
  timeLimitMinutes: number | null;
  shuffleQuestions: boolean;
}

const refusal = new ApiError({
  kind: 'validation',
  messageKey: 'errors.validation.failed',
  status: 400,
  violations: [
    { field: 'timeLimitSeconds', messageKey: 'errors.quiz.settingUnavailable' },
    { field: 'shuffleQuestions', messageKey: 'errors.quiz.settingUnavailable' },
  ],
  retryable: false,
});

function Probe() {
  const form = useForm<QuizLikeForm>({
    defaultValues: { timeLimitMinutes: 10, shuffleQuestions: true },
  });
  useServerValidation(form, refusal, { timeLimitSeconds: 'timeLimitMinutes' });
  const { errors } = form.formState;
  return (
    <>
      <p data-testid="time">{errors.timeLimitMinutes?.message ?? ''}</p>
      <p data-testid="shuffle">{errors.shuffleQuestions?.message ?? ''}</p>
    </>
  );
}

afterEach(cleanup);

describe('useServerValidation — field aliases', () => {
  it('puts each refusal on the field that edits it', async () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <Probe />
      </I18nextProvider>
    );
    await waitFor(() =>
      expect(screen.getByTestId('time').textContent).not.toBe('')
    );
    // The time-limit refusal reached the minutes field, with the same
    // message as the field the server named directly.
    expect(screen.getByTestId('time').textContent).toBe(
      screen.getByTestId('shuffle').textContent
    );
  });

  it('has the refusal message in both languages', () => {
    expect(en.quiz.settingUnavailable).toMatch(/isn't available/);
    expect(ar.quiz.settingUnavailable).toMatch(/غير متاح/);
  });
});
