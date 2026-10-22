/**
 * The countdown hydrates without a mismatch even when the page reaches the
 * browser seconds — or a whole deadline — after the server rendered it (an
 * edge-cached page): hydration renders the server's moment, then the clock
 * takes over.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { hydrateRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { PublicWebsiteLocaleProvider } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import type { CountdownSectionConfig } from '@types';
import { CountdownStatus, useCountdown } from './countdown';

const config: CountdownSectionConfig = {
  title: { en: 'Closes soon', ar: '' },
  deadline: '2030-01-10T12:00:00+02:00',
  timeZone: 'Africa/Cairo',
  endedMessage: { en: 'Closed.', ar: '' },
};

function Countdown() {
  const state = useCountdown(config, 'en');
  return (
    <section {...state.rootProps}>
      <CountdownStatus state={state} classes={{}} />
      <p>{state.closes}</p>
    </section>
  );
}

const tree = (
  <I18nextProvider i18n={createI18nInstance('en')}>
    <PublicWebsiteLocaleProvider locale="en">
      <Countdown />
    </PublicWebsiteLocaleProvider>
  </I18nextProvider>
);

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('countdown hydration', () => {
  it.each([
    ['five seconds later', '2030-01-10T11:00:05+02:00', 'running'],
    ['after the deadline passed', '2030-01-10T12:30:00+02:00', 'ended'],
  ])(
    'matches the server’s HTML when it arrives %s, then shows the real time',
    async (_when, clientTime, finalStatus) => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
      vi.setSystemTime(new Date('2030-01-10T11:00:00+02:00'));
      const html = renderToString(tree);
      expect(html).toContain('data-countdown-now');

      const container = document.createElement('div');
      container.innerHTML = html;
      document.body.appendChild(container);
      const serverText = container.textContent;

      vi.setSystemTime(new Date(clientTime));
      const recoverable = vi.fn();
      const consoleError = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      await act(async () => {
        hydrateRoot(container, tree, { onRecoverableError: recoverable });
      });
      expect(recoverable).not.toHaveBeenCalled();
      expect(
        consoleError.mock.calls.filter((call) =>
          String(call[0]).match(/did not match|hydrat/i)
        )
      ).toEqual([]);
      consoleError.mockRestore();
      expect(
        container
          .querySelector('[data-countdown-status]')!
          .getAttribute('data-countdown-status')
      ).toBe(finalStatus);
      if (finalStatus === 'running') {
        expect(container.textContent).not.toBe(serverText);
        expect(
          container.querySelector('[data-unit="seconds"] span')!.textContent
        ).toBe('55');
      }
    }
  );
});
