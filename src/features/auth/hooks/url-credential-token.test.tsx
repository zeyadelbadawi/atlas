/**
 * ATO review F12 — a reset/setup token is read from the URL once and then
 * removed from the address bar (and so from history), while the page keeps
 * the value and every other query parameter stays.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { useUrlCredentialToken } from './useUrlCredentialToken';

function Probe() {
  const token = useUrlCredentialToken();
  return <p data-testid="token">{token ?? 'none'}</p>;
}

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

describe('useUrlCredentialToken', () => {
  it('keeps the token for the page and strips it from the address bar', () => {
    window.history.replaceState(
      null,
      '',
      '/reset-password?token=secret-abc&setup=1'
    );
    const router = createMemoryRouter(
      [{ path: '/reset-password', element: <Probe /> }],
      {
        initialEntries: ['/reset-password?token=secret-abc&setup=1'],
      }
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('token').textContent).toBe('secret-abc');
    expect(window.location.search).toBe('?setup=1');
    expect(window.location.href).not.toContain('secret-abc');
  });

  it('is null without a token and leaves the URL alone', () => {
    window.history.replaceState(null, '', '/reset-password?setup=1');
    const router = createMemoryRouter(
      [{ path: '/reset-password', element: <Probe /> }],
      {
        initialEntries: ['/reset-password?setup=1'],
      }
    );
    render(<RouterProvider router={router} />);
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(window.location.search).toBe('?setup=1');
  });
});
