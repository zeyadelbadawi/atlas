/**
 * W6 — the wizard stepper is an accessible, keyboard-operable step list:
 * `aria-current="step"`, names that carry number + label + state, one tab
 * stop with Arrow/Home/End movement (mirrored in RTL), Enter to open, and
 * locked steps that stay discoverable but do nothing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { CourseWizardStepper } from './CourseWizardStepper';
import {
  deriveCourseWizardStepStates,
  type CourseWizardStep,
} from './course-wizard.steps';

afterEach(() => cleanup());

const states = {
  ...deriveCourseWizardStepStates(undefined, undefined),
  basics: 'complete' as const,
};

function renderStepper(
  options: {
    current?: CourseWizardStep;
    locked?: CourseWizardStep[];
    language?: 'en' | 'ar';
  } = {}
) {
  const onSelect = vi.fn();
  render(
    <I18nextProvider i18n={createI18nInstance(options.language ?? 'en')}>
      <CourseWizardStepper
        current={options.current ?? 'details'}
        states={states}
        lockedSteps={options.locked}
        onSelect={onSelect}
      />
    </I18nextProvider>
  );
  return { onSelect };
}

describe('CourseWizardStepper', () => {
  it('is a labelled nav with an ordered list; the current step has aria-current="step"', async () => {
    renderStepper();
    const nav = screen.getByRole('navigation', { name: 'Course setup steps' });
    const items = within(nav).getAllByRole('listitem');
    expect(items).toHaveLength(8);
    const current = within(nav).getByRole('button', { name: /^2\. Details/ });
    expect(current.getAttribute('aria-current')).toBe('step');
    expect(
      within(nav)
        .getAllByRole('button')
        .filter((b) => b.getAttribute('aria-current') === 'step')
    ).toHaveLength(1);
    // State is part of the name, never colour alone.
    expect(
      within(nav).getByRole('button', { name: '1. Basics, Completed' })
    ).toBeTruthy();
    expect(
      within(nav).getByRole('button', { name: '5. Assessments, Optional' })
    ).toBeTruthy();
    expect(screen.getByText('Step 2 of 8 · Details')).toBeTruthy();
  });

  it('has one tab stop and moves with the arrow keys, Home and End; Enter opens a step', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderStepper();
    const buttons = screen.getAllByRole('button');
    expect(buttons.filter((b) => b.tabIndex === 0)).toHaveLength(1);
    expect(buttons[1].tabIndex).toBe(0); // the current step

    buttons[1].focus();
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[2]);
    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(buttons[3]);
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[2]);
    await user.keyboard('{End}');
    expect(document.activeElement).toBe(buttons[7]);
    await user.keyboard('{Home}');
    expect(document.activeElement).toBe(buttons[0]);
    expect(buttons[0].tabIndex).toBe(0);

    await user.keyboard('{ArrowRight}{ArrowRight}{Enter}');
    expect(onSelect).toHaveBeenCalledWith('media');
  });

  it('mirrors the horizontal arrows in Arabic (RTL)', async () => {
    const user = userEvent.setup();
    renderStepper({ language: 'ar' });
    const buttons = screen.getAllByRole('button');
    buttons[1].focus();
    await user.keyboard('{ArrowLeft}');
    expect(document.activeElement).toBe(buttons[2]);
    await user.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(buttons[1]);
    expect(
      screen.getByRole('navigation', { name: 'خطوات إعداد الدورة' })
    ).toBeTruthy();
  });

  it('locked steps are focusable, aria-disabled, explained, and do nothing', async () => {
    const user = userEvent.setup();
    const { onSelect } = renderStepper({
      current: 'basics',
      locked: [
        'details',
        'media',
        'curriculum',
        'assessments',
        'pricing',
        'review',
        'publish',
      ],
    });
    const details = screen.getByRole('button', { name: /^2\. Details/ });
    expect(details.getAttribute('aria-disabled')).toBe('true');
    expect(details.textContent).toContain(
      'Available after the course is created'
    );
    await user.click(details);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
