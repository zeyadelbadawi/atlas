/**
 * The one shared failure toast (it was three copies: course, academy,
 * announcements). A failed action reads as its title over the real reason;
 * a cancelled request says nothing; a course reorder adds what happened
 * next after the reason.
 */
import { describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createApiError } from '@api';
import { ToastContext } from '@app/providers';
import type { ToastContextValue } from '@app/providers';
import { createI18nInstance } from '@/localization/i18n';
import { useActionFailureToast } from './useActionFailureToast';

function setup() {
  const i18n = createI18nInstance('en');
  const toast = {
    notify: vi.fn(),
    notifySuccess: vi.fn(),
    notifyError: vi.fn(),
    dismissAll: vi.fn(),
  } satisfies ToastContextValue;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nextProvider i18n={i18n}>
      <ToastContext.Provider value={toast}>{children}</ToastContext.Provider>
    </I18nextProvider>
  );
  const { result } = renderHook(() => useActionFailureToast(), { wrapper });
  return { toast, fail: result.current, i18n };
}

describe('useActionFailureToast', () => {
  it('shows the action title over the real reason', () => {
    const { toast, fail } = setup();
    fail(createApiError('server'), 'course:settings.publishError');
    expect(toast.notifyError).toHaveBeenCalledTimes(1);
    const [title, description] = toast.notifyError.mock.calls[0];
    expect(title).toBe('course:settings.publishError');
    expect(description).toMatch(/^errors:/);
  });

  it('says nothing for a cancelled request', () => {
    const { toast, fail } = setup();
    fail(createApiError('cancelled'), 'course:settings.publishError');
    expect(toast.notifyError).not.toHaveBeenCalled();
  });

  it('uses a feature’s own reason when given', () => {
    const { toast, fail } = setup();
    fail(createApiError('conflict'), 'academy:members.remove.failedTitle', {
      specificKey: 'academy:members.remove.ownerBlocked',
    });
    expect(toast.notifyError).toHaveBeenCalledWith(
      'academy:members.remove.failedTitle',
      'academy:members.remove.ownerBlocked',
      undefined
    );
  });

  it('adds the follow-up sentence after the reason', () => {
    const { toast, fail, i18n } = setup();
    fail(createApiError('server'), 'course:builder.reorderError', {
      afterKey: 'course:builder.order.failed',
    });
    const [, key, values] = toast.notifyError.mock.calls[0];
    expect(key).toBe('common:feedback.reasonThen');
    expect(values.then).toBe(i18n.t('course:builder.order.failed'));
    expect(values.reason.length).toBeGreaterThan(0);
  });
});
