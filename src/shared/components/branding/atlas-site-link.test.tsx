/**
 * The Atlas mark links to the Atlas website (owner request, 21 Oct 2026):
 * "Powered by Atlas" on Academy surfaces and the dashboard's Atlas mark.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type * as ConfigModule from '@config';

const env = vi.hoisted(() => ({ siteUrl: 'https://atlass.dpdns.org' as string | undefined }));
vi.mock('@config', async (importOriginal) => {
  const actual = await importOriginal<typeof ConfigModule>();
  return {
    ...actual,
    ENV: new Proxy({ ...actual.ENV }, {
      get: (target, key) => (key === 'siteUrl' ? env.siteUrl : Reflect.get(target, key)),
    }),
  };
});

import { AtlasPlatformAttribution } from './AtlasPlatformAttribution';
import { AtlasSiteLink } from './AtlasSiteLink';

afterEach(() => {
  cleanup();
  env.siteUrl = 'https://atlass.dpdns.org';
});

describe('AtlasSiteLink', () => {
  it('links "Powered by Atlas" to the Atlas website in a new tab', () => {
    render(<AtlasPlatformAttribution />);
    const link = screen.getByTestId('atlas-site-link') as HTMLAnchorElement;
    expect(link.href).toBe('https://atlass.dpdns.org/');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener');
    expect(screen.getByTestId('atlas-platform-attribution').contains(link)).toBe(true);
  });

  it('renders the mark unlinked when no site URL is configured', () => {
    env.siteUrl = undefined;
    render(
      <AtlasSiteLink>
        <span>Atlas</span>
      </AtlasSiteLink>
    );
    expect(screen.queryByTestId('atlas-site-link')).toBeNull();
    expect(screen.getByText('Atlas')).toBeTruthy();
  });
});
