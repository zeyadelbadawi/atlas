/**
 * The generic academy-website Contact section (`ContactSection`, used by
 * every theme without its own contact form) carries the same protections
 * as Theme 1's form (`t1-page-sections.tsx`):
 *
 *   - a honeypot field (`company`) a person never meets — hidden from
 *     assistive tech, out of the tab order — sent only when a bot fills it,
 *     so the backend can discard the message while answering normally;
 *   - every field checked against the server's own limit, counted and
 *     refused rather than cut (B9).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { publicWebsiteService } from '@services';
import type { ContactSectionConfig } from '@types';

vi.mock('@hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAcademyIdentity: () => ({ data: undefined }),
}));
vi.mock('../renderer/renderer-style.utils', () => ({
  useWebsiteContainerClass: () => '',
  useWebsiteSectionClass: () => '',
  useWebsiteHeadingClass: () => '',
}));

const { ContactSection } = await import('./ContactSection');

const config = { showForm: true } as unknown as ContactSectionConfig;
const i18n = createI18nInstance('en');

function renderSection() {
  return render(
    <I18nextProvider i18n={i18n}>
      <ContactSection config={config} academyId="a1" />
    </I18nextProvider>
  );
}

async function fill(user: ReturnType<typeof userEvent.setup>) {
  const [name, email] = screen.getAllByRole('textbox');
  await user.type(name, 'Sara');
  await user.type(email, 'sara@example.com');
  await user.type(screen.getAllByRole('textbox')[2], 'Hello there');
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ContactSection (generic academy website)', () => {
  it('never cuts a field and hides the trap from people', () => {
    const { container } = renderSection();
    const byName = (name: string) =>
      container.querySelector<HTMLInputElement>(`[name="${name}"]`)!;
    // B9 — bounded without cutting: no `maxlength` (the form counts and
    // refuses instead, b9-contact-form.test.tsx).
    expect(byName('name').hasAttribute('maxlength')).toBe(false);
    expect(byName('message').hasAttribute('maxlength')).toBe(false);
    const trap = byName('company');
    expect(trap.tabIndex).toBe(-1);
    expect(trap.closest('[aria-hidden]')).toBeTruthy();
  });

  it('does not send the trap when a person submits', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });
    renderSection();
    await fill(user);
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() =>
      expect(submit).toHaveBeenCalledWith('a1', {
        name: 'Sara',
        email: 'sara@example.com',
        message: 'Hello there',
      })
    );
  });

  it('sends the trap when a bot fills it', async () => {
    const submit = vi
      .spyOn(publicWebsiteService, 'submitContactMessage')
      .mockResolvedValue(undefined);
    const user = userEvent.setup({ delay: null });
    const { container } = renderSection();
    await fill(user);
    fireEvent.change(container.querySelector('input[name="company"]')!, {
      target: { value: 'Acme' },
    });
    fireEvent.submit(screen.getByRole('button').closest('form')!);
    await waitFor(() =>
      expect(submit.mock.calls[0][1]).toMatchObject({ company: 'Acme' })
    );
  });
});
