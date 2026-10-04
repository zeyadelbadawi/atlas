/**
 * The live preview fits the width it has. At 390 px the setup form leaves
 * about 310 px for it; a fixed 0.4 scale of the 1280 px canvas (512 px)
 * showed only the left part of the page. The canvas now scales down to the
 * frame's width, and the frame's height shrinks in proportion, so the
 * whole page width is always visible.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { getWebsiteTheme } from '../themes/website-theme.registry';
import type { BrandPalette } from '../brand-engine';
import { brandPreviewSample } from './brand-preview-sample';
import { BrandPreviewFrame } from './BrandPreviewFrame';

vi.mock('../renderer', () => ({
  WebsiteRenderer: () => <div data-testid="renderer" />,
}));

const theme = getWebsiteTheme('modern-education');

function frameAt(width: number) {
  const spy = vi
    .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
    .mockReturnValue(width);
  const sample = brandPreviewSample('Nile Academy');
  render(
    <BrandPreviewFrame
      palette={
        {
          seeds: { primary: theme.tokens.defaultPrimary },
          roles: {},
        } as unknown as BrandPalette
      }
      themeKey="modern-education"
      academyId=""
      academyName="Nile Academy"
      configuration={sample.configuration}
      pages={[sample.page]}
      page={sample.page}
      scale={0.4}
      height={420}
    />
  );
  spy.mockRestore();
  return screen.getByTestId('brand-preview-frame');
}

afterEach(cleanup);

describe('BrandPreviewFrame — fits the available width', () => {
  it('scales the 1280 px canvas down to a 310 px phone frame', () => {
    const frame = frameAt(310);
    expect(Number(frame.dataset.scale)).toBeCloseTo(310 / 1280, 4);
    expect(frame.style.height).toBe(
      `${Math.round((420 * (310 / 1280)) / 0.4)}px`
    );
    const canvas = frame.firstElementChild as HTMLElement;
    expect(canvas.style.transform).toBe(`scale(${310 / 1280})`);
  });

  it('never scales above the requested scale on a wide frame', () => {
    const frame = frameAt(900);
    expect(Number(frame.dataset.scale)).toBe(0.4);
    expect(frame.style.height).toBe('420px');
  });
});
