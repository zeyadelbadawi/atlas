/**
 * B9 (UX audit) — the academy host's own pages:
 *
 *   - V04 every `/courses/:id` has a Course Details page, even when the
 *     published pages carry none (a site published before it existed);
 *   - V09 a reset link the server couldn't CHECK is not "invalid or has
 *     expired": it says the check failed and offers Try again (h2 under the
 *     page's h1, V19);
 *   - V07/V10 the site-down page offers Try again and the tab names it.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { createApiError } from '@api';
import type { WebsitePage } from '@types';

const tokenState = vi.hoisted(() => ({
  value: {} as {
    data?: boolean;
    isPending: boolean;
    isError?: boolean;
    error?: unknown;
  },
}));
const refetch = vi.hoisted(() => vi.fn());
vi.mock('@features/auth', () => ({
  useUrlCredentialToken: () => 'tok',
  useValidatePasswordResetToken: () => ({
    ...tokenState.value,
    isFetching: false,
    refetch,
  }),
  ResetPasswordForm: () => <div data-testid="form" />,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('./components/PublicWebsiteAuthShell', () => ({
  PublicWebsiteAuthShell: ({
    title,
    children,
  }: {
    title: ReactNode;
    children: () => ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children()}
    </div>
  ),
}));
vi.mock('./utils/public-website-link-renderer', () => ({
  usePublicWebsiteHrefBuilder: () => (path: string) => path,
  usePublicWebsiteLinkRenderer:
    () =>
    ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

const { PublicWebsiteResetPasswordPage } =
  await import('./components/PublicWebsiteResetPasswordPage');
const { PublicWebsiteStatus } =
  await import('./components/PublicWebsiteStatus');
const { resolvePathToPage } = await import('./utils/page-resolution.utils');

afterEach(() => {
  cleanup();
  refetch.mockReset();
  tokenState.value = { isPending: false };
});

const page = (fields: Partial<WebsitePage>): WebsitePage =>
  ({
    id: 'p',
    academyId: 'a1',
    pageType: 'core',
    title: 'Home',
    slug: 'home',
    visible: true,
    seo: {},
    sections: [],
    ...fields,
  }) as WebsitePage;

describe('V04 course details route', () => {
  it('answers /courses/:id with a built-in Course Details page when none is published', () => {
    const pages = [page({ id: 'home', coreType: 'home' })];
    const resolved = resolvePathToPage('/courses/c-1', pages);
    expect(resolved.courseId).toBe('c-1');
    expect(resolved.page?.coreType).toBe('courseDetails');
    expect(resolved.page?.academyId).toBe('a1');
  });

  it('uses the published Course Details page when there is one', () => {
    const published = page({ id: 'cd', coreType: 'courseDetails' });
    expect(resolvePathToPage('/courses/c-1/', [published]).page).toBe(
      published
    );
  });

  it('still answers "not found" for an unknown page', () => {
    expect(
      resolvePathToPage('/nope', [page({ coreType: 'home' })]).page
    ).toBeUndefined();
  });
});

function renderReset() {
  return render(
    <MemoryRouter initialEntries={['/reset-password?token=tok']}>
      <PublicWebsiteResetPasswordPage lookupKey="falcon" locale="en" />
    </MemoryRouter>
  );
}

describe('V09 reset link check', () => {
  it('a server fault says the CHECK failed, with Try again — not "expired"', () => {
    tokenState.value = {
      isPending: false,
      isError: true,
      error: createApiError('server', { status: 500 }),
    };
    const { container } = renderReset();
    expect(screen.getByTestId('reset-password-check-failed')).toBeTruthy();
    expect(container.textContent).toContain(
      'publicWebsite:auth.resetPassword.checkFailedTitle'
    );
    expect(container.textContent).toContain(
      'publicWebsite:auth.linkCheck.server'
    );
    expect(container.textContent).not.toContain('invalidTitle');
    screen.getByRole('button', { name: 'common:actions.retry' }).click();
    expect(refetch).toHaveBeenCalled();
    // Under the page's h1 (V19).
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(
      'publicWebsite:auth.resetPassword.checkFailedTitle'
    );
  });

  it('a network failure names the connection', () => {
    tokenState.value = {
      isPending: false,
      isError: true,
      error: createApiError('network'),
    };
    const { container } = renderReset();
    expect(container.textContent).toContain(
      'publicWebsite:auth.linkCheck.network'
    );
  });

  it('an answer of "not valid" is still "invalid or has expired"', () => {
    tokenState.value = { isPending: false, data: false };
    const { container } = renderReset();
    expect(screen.getByTestId('reset-password-invalid')).toBeTruthy();
    expect(container.textContent).toContain(
      'publicWebsite:auth.resetPassword.invalidTitle'
    );
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });
});

describe('V07/V10 site status pages', () => {
  function renderStatus(status: 'unavailable' | 'not-found') {
    return render(
      <QueryClientProvider client={new QueryClient()}>
        <PublicWebsiteStatus state={{ status }} />
      </QueryClientProvider>
    );
  }

  it('a site that is down offers Try again and names itself in the tab', () => {
    renderStatus('unavailable');
    expect(
      screen.getByRole('button', { name: 'common:actions.retry' })
    ).toBeTruthy();
    expect(document.title).toBe('website:public.unavailable.title');
  });

  it('a wrong address has no Try again, and is not titled "Atlas"', () => {
    renderStatus('not-found');
    expect(screen.queryByRole('button')).toBeNull();
    expect(document.title).toBe('website:public.notFound.title');
  });
});
