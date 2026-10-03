/**
 * MarketingContactSection — the Atlas homepage contact form (TASK 7).
 *
 * Native DOM assertions only (this repo has no jest-dom), and the mocked
 * `t` echoes its key so the assertions stay on behaviour rather than copy.
 *
 * Pinned here:
 *   - client validation mirrors the server: required fields, trimming
 *     (whitespace-only is empty), minimum lengths, a valid email, a topic;
 *     errors are tied to their fields and nothing is sent while invalid;
 *   - a valid form sends the trimmed values plus `locale`, `sourcePath`
 *     and `startedAt`, and never the honeypot unless a bot filled it;
 *   - the pending state disables the form and the button;
 *   - success replaces the form with one honest "received" state, and
 *     failure keeps the visitor's text and says so (rate limit included).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

const mockSubmit = vi.fn();

vi.mock('../services/PlatformContactService', () => ({
  platformContactService: { submit: (payload: unknown) => mockSubmit(payload) },
}));
vi.mock(
  '@/components/ui/select',
  () => import('@features/platform-observability/test-support/select-mock')
);
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'ar', dir: () => 'rtl', exists: () => true },
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

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(field('home:contact.form.name'), '  Layla Haddad  ');
  await user.type(field('home:contact.form.email'), 'layla@falcon.example');
  await user.type(field('home:contact.form.organization'), 'Falcon Learning');
  fireEvent.change(field('home:contact.form.topic'), {
    target: { value: 'partnership' },
  });
  await user.type(
    field('home:contact.form.message'),
    'We run three academies and would like a walkthrough.'
  );
}

const submitButton = () =>
  screen.getByRole('button', {
    name: /home:contact\.form\.(submit|submitting)/,
  }) as HTMLButtonElement;

describe('MarketingContactSection', () => {
  beforeEach(() => {
    mockSubmit.mockReset();
  });
  afterEach(() => cleanup());

  it('renders under the #contact anchor with every field labelled', () => {
    const { container } = renderSection();
    expect(container.querySelector('section#contact')).not.toBeNull();
    for (const key of [
      'home:contact.form.name',
      'home:contact.form.email',
      'home:contact.form.organization',
      'home:contact.form.topic',
      'home:contact.form.message',
    ]) {
      expect(field(key)).toBeTruthy();
    }
    // The honeypot is present but hidden from people and assistive tech.
    const trap = container.querySelector(
      'input[name="company"]'
    ) as HTMLInputElement;
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden]')).not.toBeNull();
  });

  it('shows field-tied errors and sends nothing when the form is empty', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(submitButton());

    expect(
      await screen.findByText('home:contact.errors.nameRequired')
    ).toBeTruthy();
    expect(screen.getByText('home:contact.errors.emailRequired')).toBeTruthy();
    expect(screen.getByText('home:contact.errors.topicRequired')).toBeTruthy();
    expect(
      screen.getByText('home:contact.errors.messageRequired')
    ).toBeTruthy();

    const name = field('home:contact.form.name');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    const describedBy = name.getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe(
      'home:contact.errors.nameRequired'
    );
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('treats whitespace as empty and enforces the minimum lengths and email shape', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.type(field('home:contact.form.name'), '     ');
    await user.type(field('home:contact.form.email'), 'not-an-email');
    await user.type(field('home:contact.form.message'), '  too short ');
    await user.click(submitButton());

    expect(
      await screen.findByText('home:contact.errors.nameRequired')
    ).toBeTruthy();
    expect(screen.getByText('home:contact.errors.emailInvalid')).toBeTruthy();
    expect(
      screen.getByText('home:contact.errors.messageTooShort')
    ).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('caps every field at the server limit', () => {
    renderSection();
    expect(field('home:contact.form.name').maxLength).toBe(200);
    expect(field('home:contact.form.email').maxLength).toBe(320);
    expect(field('home:contact.form.organization').maxLength).toBe(200);
    expect(field('home:contact.form.message').maxLength).toBe(5000);
  });

  it('sends trimmed values with locale, path and startedAt, shows pending, then the success state', async () => {
    let resolve: (value: unknown) => void = () => undefined;
    mockSubmit.mockImplementation(
      () => new Promise((done) => (resolve = done))
    );
    const user = userEvent.setup();
    renderSection();
    await fillValid(user);
    await user.click(submitButton());

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    const payload = mockSubmit.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).toMatchObject({
      name: 'Layla Haddad',
      email: 'layla@falcon.example',
      organizationName: 'Falcon Learning',
      topic: 'partnership',
      message: 'We run three academies and would like a walkthrough.',
      locale: 'ar',
      sourcePath: '/',
    });
    expect(typeof payload.startedAt).toBe('number');
    expect(payload).not.toHaveProperty('company');

    // Pending: the button reads "sending", and nothing can be resubmitted.
    expect(submitButton().disabled).toBe(true);
    expect(submitButton().textContent).toContain(
      'home:contact.form.submitting'
    );
    expect(field('home:contact.form.message').disabled).toBe(true);

    await act(async () => resolve({ received: true }));
    expect(await screen.findByTestId('marketing-contact-success')).toBeTruthy();
    expect(screen.getByText('home:contact.success.title')).toBeTruthy();
    expect(screen.queryByRole('form')).toBeNull();

    // "Send another" brings back an empty form.
    await user.click(
      screen.getByRole('button', { name: 'home:contact.success.again' })
    );
    expect(field('home:contact.form.name').value).toBe('');
  });

  it('sends the honeypot only when something filled it', async () => {
    mockSubmit.mockResolvedValue({ received: true });
    const user = userEvent.setup();
    const { container } = renderSection();
    await fillValid(user);
    fireEvent.change(
      container.querySelector('input[name="company"]') as Element,
      {
        target: { value: 'Spam Corp' },
      }
    );
    await user.click(submitButton());
    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({ company: 'Spam Corp' });
  });

  it('keeps the text and explains a failure, with its own copy for the rate limit', async () => {
    mockSubmit.mockRejectedValueOnce({
      kind: 'server',
      messageKey: 'errors.unknown',
    });
    const user = userEvent.setup();
    renderSection();
    await fillValid(user);
    await user.click(submitButton());

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('home:contact.failure.title');
    expect(alert.textContent).toContain('home:contact.failure.description');
    expect(field('home:contact.form.name').value).toBe('  Layla Haddad  ');
    expect(submitButton().disabled).toBe(false);

    mockSubmit.mockRejectedValueOnce({
      kind: 'rateLimited',
      messageKey: 'errors.rateLimited',
    });
    await user.click(submitButton());
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain(
        'home:contact.failure.rateLimited'
      )
    );
    expect(screen.queryByTestId('marketing-contact-success')).toBeNull();
  });
});
