/**
 * P4 — full-screen exams, client side.
 *
 * Root cause pinned here: the old runner asked for full screen from a
 * mount effect, which browsers refuse (no user gesture), and swallowed
 * the refusal. Now the Start click asks — synchronously, before the start
 * request is awaited — and the exit policy is one decision
 * (`fullscreenView`): out of full screen the questions wait behind a gate
 * (answers and timer kept); unsupported or refused never traps the
 * learner and is recorded for the reviewer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import type { ReactNode } from 'react';
import { createI18nInstance } from '@/localization/i18n';
import {
  fullscreenView,
  isFullscreenSupported,
  useQuizFullscreen,
} from './hooks/useQuizFullscreen';
import { QuizFullscreenGate } from './components/QuizFullscreenGate';

/* ---------- a controllable Fullscreen API on jsdom ---------- */

let fullscreenElement: Element | null = null;
let requestImpl: () => Promise<void>;
const calls: string[] = [];

function installFullscreen(enabled: boolean) {
  Object.defineProperty(document, 'fullscreenEnabled', {
    configurable: true,
    get: () => enabled,
  });
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement,
  });
  document.documentElement.requestFullscreen = enabled
    ? vi.fn(() => {
        calls.push('requestFullscreen');
        return requestImpl();
      })
    : (undefined as unknown as typeof document.documentElement.requestFullscreen);
  document.exitFullscreen = vi.fn(async () => {
    fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
  });
}

beforeEach(() => {
  fullscreenElement = null;
  calls.length = 0;
  requestImpl = async () => {
    fullscreenElement = document.documentElement;
    document.dispatchEvent(new Event('fullscreenchange'));
  };
  installFullscreen(true);
});
afterEach(cleanup);

describe('fullscreenView — the exit policy', () => {
  const base = {
    required: true,
    supported: true,
    active: false,
    lastResult: null,
    continuedWithout: false,
  } as const;
  it.each([
    ['not required', { ...base, required: false }, 'none'],
    ['in full screen', { ...base, active: true }, 'none'],
    ['out of full screen → gate', base, 'gate'],
    [
      'refused → gate offering to continue',
      { ...base, lastResult: 'refused' as const },
      'gate-refused',
    ],
    [
      'continued after a refusal',
      { ...base, lastResult: 'refused' as const, continuedWithout: true },
      'none',
    ],
    [
      'unsupported → notice, never a gate',
      { ...base, supported: false },
      'unsupported',
    ],
  ])('%s', (_name, input, expected) => {
    expect(fullscreenView(input)).toBe(expected);
  });
});

describe('useQuizFullscreen', () => {
  it('enters, tracks the change, and exits', async () => {
    const { result } = renderHook(() => useQuizFullscreen());
    expect(result.current.supported).toBe(true);
    await act(async () => {
      await expect(result.current.request()).resolves.toBe('entered');
    });
    expect(result.current.active).toBe(true);
    await act(async () => result.current.exit());
    expect(result.current.active).toBe(false);
  });

  it('a refused request resolves to "refused" (never throws)', async () => {
    requestImpl = () =>
      Promise.reject(new TypeError('Permissions check failed'));
    const { result } = renderHook(() => useQuizFullscreen());
    await act(async () => {
      await expect(result.current.request()).resolves.toBe('refused');
    });
    expect(result.current.lastResult).toBe('refused');
    expect(result.current.active).toBe(false);
  });

  it('no API (e.g. iPhone Safari) → "unsupported" without calling anything', async () => {
    installFullscreen(false);
    expect(isFullscreenSupported()).toBe(false);
    const { result } = renderHook(() => useQuizFullscreen());
    await act(async () => {
      await expect(result.current.request()).resolves.toBe('unsupported');
    });
    expect(calls).toEqual([]);
  });

  it('calls requestFullscreen synchronously — inside the caller’s gesture', () => {
    const { result } = renderHook(() => useQuizFullscreen());
    void result.current.request();
    // No await has happened yet.
    expect(calls).toEqual(['requestFullscreen']);
  });
});

describe('QuizFullscreenGate', () => {
  const wrap = (node: ReactNode, locale: 'en' | 'ar' = 'en') =>
    render(
      <I18nextProvider i18n={createI18nInstance(locale)}>
        {node}
      </I18nextProvider>
    );

  it('gate: one way back; no "continue without" until the browser refused', async () => {
    const onEnter = vi.fn();
    wrap(
      <QuizFullscreenGate
        view="gate"
        onEnter={onEnter}
        onContinueWithout={vi.fn()}
      />
    );
    expect(
      screen.getByRole('heading', { name: 'Return to full screen to continue' })
    ).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Continue without full screen' })
    ).toBeNull();
    await userEvent.click(
      screen.getByRole('button', { name: 'Enter full screen' })
    );
    expect(onEnter).toHaveBeenCalledTimes(1);
  });

  it('refused: says so and offers to continue', async () => {
    const onContinue = vi.fn();
    wrap(
      <QuizFullscreenGate
        view="gate-refused"
        onEnter={vi.fn()}
        onContinueWithout={onContinue}
      />
    );
    expect(screen.getByRole('status').textContent).toBe(
      'Your browser didn’t allow full screen.'
    );
    await userEvent.click(
      screen.getByRole('button', { name: 'Continue without full screen' })
    );
    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  it('unsupported (Arabic): a notice, no gate', () => {
    wrap(
      <QuizFullscreenGate
        view="unsupported"
        onEnter={vi.fn()}
        onContinueWithout={vi.fn()}
      />,
      'ar'
    );
    expect(
      screen.getByText('وضع ملء الشاشة غير متاح في هذا المتصفح')
    ).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('QuizFullscreenGate focus', () => {
  it('takes focus when it appears (the questions just disappeared); the unsupported notice does not', () => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <QuizFullscreenGate view="gate" onEnter={vi.fn()} onContinueWithout={vi.fn()} />
      </I18nextProvider>
    );
    expect(document.activeElement).toBe(screen.getByTestId('quiz-fullscreen-gate'));
    cleanup();
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <QuizFullscreenGate view="unsupported" onEnter={vi.fn()} onContinueWithout={vi.fn()} />
      </I18nextProvider>
    );
    expect(document.activeElement).toBe(document.body);
  });
});
