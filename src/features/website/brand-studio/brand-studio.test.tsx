/**
 * Brand Studio UI (Theme 1 plan §F.4.5 component tests): labelled
 * controls, contrast results as text, a calm message for a bad file, the
 * preview fed the live palette, and Accept only when every pair passes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import { BrandStudio } from './BrandStudio';
import { useBrandStudio } from './useBrandStudio';
import type { BrandPalette } from '../brand-engine';

const i18n = createI18nInstance('en');
const theme = getWebsiteTheme('modern-education');

function Harness({ onPreview }: { onPreview: (p: BrandPalette) => void }) {
  const studio = useBrandStudio({ theme });
  return (
    <I18nextProvider i18n={i18n}>
      <BrandStudio
        studio={studio}
        renderPreview={(palette) => {
          onPreview(palette);
          return <div data-testid="preview">{palette.roles.cta}</div>;
        }}
      />
    </I18nextProvider>
  );
}

afterEach(cleanup);

describe('BrandStudio', () => {
  it('labels every seed control and reports contrast as text', () => {
    render(<Harness onPreview={() => undefined} />);
    for (const label of ['Primary', 'Secondary', 'Accent']) {
      expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText('Passes contrast').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(/Contrast \d+(\.\d+)?:1/).length
    ).toBeGreaterThan(0);
  });

  it('re-renders the preview with the new palette when a seed changes', () => {
    const previews: BrandPalette[] = [];
    render(<Harness onPreview={(p) => previews.push(p)} />);
    const before = previews.at(-1)!.roles.cta;
    fireEvent.blur(screen.getAllByRole('textbox')[0], {
      target: { value: '#7c3aed' },
    });
    expect(previews.at(-1)!.roles.cta).not.toBe(before);
    expect(previews.at(-1)!.seeds.primary).not.toBe(
      theme.tokens.defaultPrimary
    );
  });

  it('explains a file it cannot use, calmly, and offers manual colours', async () => {
    render(<Harness onPreview={() => undefined} />);
    const input = document.querySelector<HTMLInputElement>('input[type=file]')!;
    await act(async () => {
      fireEvent.change(input, {
        target: {
          files: [new File(['GIF89a'], 'logo.gif', { type: 'image/gif' })],
        },
      });
    });
    await waitFor(() =>
      expect(
        screen.getByText(
          "That file type isn't supported. Use PNG, JPG, WebP or SVG."
        )
      ).toBeTruthy()
    );
    expect(
      screen.getByText('You can try another file, or pick your colours below.')
    ).toBeTruthy();
  });

  it('accepts a passing palette and shows it as accepted', () => {
    render(<Harness onPreview={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Accept palette' }));
    expect(
      (
        screen.getByRole('button', {
          name: 'Palette accepted',
        }) as HTMLButtonElement
      ).disabled
    ).toBe(true);
  });
});
