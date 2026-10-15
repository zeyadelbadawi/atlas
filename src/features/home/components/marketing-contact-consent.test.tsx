/**
 * MarketingContactSection with the B0-SUP-04 / B0-ANL-04 flags ON (they
 * ship OFF; `marketing-contact-section.test.tsx` pins that default).
 *
 * Pinned here:
 *   - both consents render UNTICKED and are sent as `false` unless ticked;
 *     each box is independent of the other;
 *   - the WhatsApp number is optional and sent only when given;
 *   - the qualification questions appear for a sales enquiry only, and are
 *     never sent for another topic;
 *   - the privacy point stops promising "only to reply";
 *   - the in-memory landing attribution travels with the enquiry.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as FlagsModule from '@config/feature-flags.config';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockSubmit = vi.fn();
const attribution = vi.hoisted(() => ({
  value: null as Record<string, string> | null,
}));

vi.mock('../services/PlatformContactService', () => ({
  platformContactService: { submit: (payload: unknown) => mockSubmit(payload) },
}));
vi.mock('@config/feature-flags.config', async (importOriginal) => ({
  ...(await importOriginal<typeof FlagsModule>()),
  isFeatureEnabled: (flag: string) =>
    flag === 'marketingContactConsent' || flag === 'signupAttribution',
}));
vi.mock('@utils/landing-attribution.utils', () => ({
  getLandingAttribution: () => attribution.value,
}));
vi.mock(
  '@/components/ui/select',
  () => import('@features/platform-observability/test-support/select-mock')
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', dir: () => 'ltr', exists: () => true },
  }),
}));

import { MarketingContactSection } from './MarketingContactSection';

function renderSection() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <MarketingContactSection />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const field = (labelKey: string) =>
  screen.getByLabelText(labelKey) as HTMLInputElement;
const checkbox = (labelKey: string) =>
  screen.getByRole('checkbox', { name: labelKey }) as HTMLButtonElement;
const submitButton = () =>
  screen.getByRole('button', { name: /home:contact\.form\.submit/ });

async function fillValid(
  user: ReturnType<typeof userEvent.setup>,
  topic = 'support'
) {
  await user.type(field('home:contact.form.name'), 'Visitor Example');
  await user.type(field('home:contact.form.email'), 'visitor@example.test');
  fireEvent.change(field('home:contact.form.topic'), { target: { value: topic } });
  await user.type(
    field('home:contact.form.message'),
    'Please tell us more about Atlas for our centre.'
  );
}

beforeAll(() => {
  // Radix (checkbox, country picker) measures elements; jsdom has no observer.
  if (!('ResizeObserver' in globalThis)) {
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
      class {
        observe(): void {}
        unobserve(): void {}
        disconnect(): void {}
      };
  }
});

describe('MarketingContactSection — consent fields on', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
    mockSubmit.mockResolvedValue({ received: true });
    attribution.value = null;
  });
  afterEach(() => cleanup());

  it('renders two separate, unticked consents and the optional WhatsApp field', () => {
    renderSection();
    expect(screen.getByTestId('marketing-contact-lead-fields')).toBeTruthy();
    const contact = checkbox('home:contact.consent.contactConsent');
    const marketing = checkbox('home:contact.consent.marketingConsent');
    expect(contact.getAttribute('aria-checked')).toBe('false');
    expect(marketing.getAttribute('aria-checked')).toBe('false');
    expect(field('home:contact.form.whatsapp')).toBeTruthy();
    expect(screen.getByText('home:contact.points.privacyWithConsent')).toBeTruthy();
  });

  it('sends both consents as false by default, and no phone when none was given', async () => {
    const user = userEvent.setup();
    renderSection();
    await fillValid(user);
    await user.click(submitButton());
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const payload = mockSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({ contactConsent: false, marketingConsent: false });
    expect(payload).not.toHaveProperty('phoneNumber');
    expect(payload).not.toHaveProperty('requesterRole');
    expect(payload).not.toHaveProperty('attribution');
  });

  it('sends only the consent that was ticked', async () => {
    const user = userEvent.setup();
    renderSection();
    await fillValid(user);
    await user.click(checkbox('home:contact.consent.marketingConsent'));
    await user.click(submitButton());
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({
      contactConsent: false,
      marketingConsent: true,
    });
  });

  it('asks the qualification questions for sales only, and sends them with the number and attribution', async () => {
    attribution.value = { utmSource: 'facebook', landingTemplate: 'home' };
    const user = userEvent.setup();
    renderSection();
    await fillValid(user, 'support');
    expect(screen.queryByTestId('marketing-contact-qualification')).toBeNull();

    fireEvent.change(field('home:contact.form.topic'), { target: { value: 'sales' } });
    expect(await screen.findByTestId('marketing-contact-qualification')).toBeTruthy();
    fireEvent.change(field('home:contact.qualification.studentBand'), {
      target: { value: '50_200' },
    });
    fireEvent.change(field('home:contact.qualification.preferredChannel'), {
      target: { value: 'whatsapp' },
    });
    await user.type(field('home:contact.form.whatsapp'), '01001234567');
    await user.click(checkbox('home:contact.consent.contactConsent'));
    await user.click(submitButton());

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const payload = mockSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      topic: 'sales',
      contactConsent: true,
      marketingConsent: false,
      studentBand: '50_200',
      preferredChannel: 'whatsapp',
      attribution: { utmSource: 'facebook', landingTemplate: 'home' },
    });
    // As typed (the input groups digits); the server normalises to E.164.
    expect(String(payload.phoneNumber).replace(/\D/g, '')).toBe('01001234567');
    expect(typeof payload.phoneCountry).toBe('string');
    expect(payload).not.toHaveProperty('requesterRole');
  });
});
