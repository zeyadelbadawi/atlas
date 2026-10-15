/**
 * The `/contact` page (owner decision D6): the platform contact form,
 * moved off the retired marketing homepage with its contract unchanged.
 *
 * Pinned here: the page is the form (one `h1`, the `#contact` section);
 * `?topic=sales` — the holding page's link — preselects that topic and
 * sends it; an unknown topic preselects nothing (the visitor must choose).
 * The mocked `t` echoes its key.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

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
    i18n: { language: 'en', dir: () => 'ltr', exists: () => true },
  }),
}));

import ContactPage from './ContactPage';

function renderAt(path: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/contact" element={<ContactPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const topic = () =>
  screen.getByLabelText('home:contact.form.topic') as HTMLSelectElement;

describe('ContactPage', () => {
  beforeEach(() => mockSubmit.mockReset());
  afterEach(() => cleanup());

  it('is the contact form, under one page heading', () => {
    const { container } = renderAt('/contact');
    expect(container.querySelector('section#contact form')).not.toBeNull();
    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0].textContent).toBe('home:contact.title');
  });

  it('preselects and sends the sales topic from ?topic=sales', async () => {
    mockSubmit.mockResolvedValue({ received: true });
    const user = userEvent.setup();
    renderAt('/contact?topic=sales');
    expect(topic().value).toBe('sales');

    await user.type(
      screen.getByLabelText('home:contact.form.name'),
      'Layla Haddad'
    );
    await user.type(
      screen.getByLabelText('home:contact.form.email'),
      'layla@falcon.example'
    );
    await user.type(
      screen.getByLabelText('home:contact.form.message'),
      'We would like to hear about running our academy on Atlas.'
    );
    await user.click(
      screen.getByRole('button', { name: 'home:contact.form.submit' })
    );

    await waitFor(() => expect(mockSubmit).toHaveBeenCalledTimes(1));
    expect(mockSubmit.mock.calls[0][0]).toMatchObject({
      topic: 'sales',
      sourcePath: '/contact',
    });
  }, 20_000);

  it('ignores a topic the form does not offer: the visitor must choose', async () => {
    const user = userEvent.setup();
    renderAt('/contact?topic=pricing');
    await user.click(
      screen.getByRole('button', { name: 'home:contact.form.submit' })
    );
    expect(
      await screen.findByText('home:contact.errors.topicRequired')
    ).toBeTruthy();
    expect(mockSubmit).not.toHaveBeenCalled();
  });
});
