/**
 * Logo analysis on synthetic images (§I.2: colour extraction, candidates,
 * monochrome, multi-colour, transparent, noisy/background colours, neon,
 * hostile buffers). Every image is generated here, so the expected colours
 * are known exactly.
 */
import { describe, expect, it } from 'vitest';
import {
  analyzeLogoPixels,
  MAX_ANALYSIS_EDGE,
  type LogoPixels,
} from './analyze';
import { hslToRgb, tripletDeltaE, formatHslTriplet } from './color-space';

type Paint = (x: number, y: number) => [number, number, number, number] | null;

function image(width: number, height: number, paint: Paint): LogoPixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const colour = paint(x, y) ?? [0, 0, 0, 0];
      data.set(colour, (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

function rgba(triplet: string, alpha = 255): [number, number, number, number] {
  const [h, s, l] = triplet.replace(/%/g, '').split(' ').map(Number);
  const rgb = hslToRgb(h, s, l);
  return [
    Math.round(rgb.r * 255),
    Math.round(rgb.g * 255),
    Math.round(rgb.b * 255),
    alpha,
  ];
}

const BLUE = '221 83% 53%';
const ORANGE = '24 95% 53%';
const TEAL = '174 60% 42%';

/** A mark filling the centre of a 64×64 canvas, in horizontal stripes. */
function stripes(colours: readonly string[], shares: readonly number[]): Paint {
  return (x, y) => {
    if (x < 8 || x > 55 || y < 8 || y > 55) return null;
    const t = (y - 8) / 48;
    let accumulated = 0;
    for (let index = 0; index < colours.length; index += 1) {
      accumulated += shares[index];
      if (t < accumulated) return rgba(colours[index]);
    }
    return rgba(colours[colours.length - 1]);
  };
}

describe('brand engine — logo analysis', () => {
  it('extracts the colours of a transparent two-colour logo (ΔE_ok < 0.03)', () => {
    const result = analyzeLogoPixels(
      image(64, 64, stripes([BLUE, ORANGE], [0.7, 0.3]))
    );
    expect(tripletDeltaE(result.seeds!.primary, BLUE)).toBeLessThan(0.03);
    expect(tripletDeltaE(result.seeds!.secondary!, ORANGE)).toBeLessThan(0.03);
    expect(result.flags).toEqual([]);
  });

  it('ignores a semi-transparent anti-alias fringe', () => {
    const logo = image(64, 64, (x, y) => {
      if (x < 8 || x > 55 || y < 8 || y > 55) return null;
      // A 1px half-transparent pink rim around a solid blue square.
      if (x === 8 || x === 55 || y === 8 || y === 55)
        return rgba('330 100% 70%', 90);
      return rgba(BLUE);
    });
    const result = analyzeLogoPixels(logo);
    expect(result.candidates).toHaveLength(1);
    expect(tripletDeltaE(result.seeds!.primary, BLUE)).toBeLessThan(0.03);
  });

  it('removes a solid coloured background rectangle (JPEG logo)', () => {
    const logo = image(64, 64, (x, y) =>
      x > 20 && x < 44 && y > 20 && y < 44 ? rgba(ORANGE) : rgba('60 30% 90%')
    );
    const result = analyzeLogoPixels(logo);
    expect(tripletDeltaE(result.seeds!.primary, ORANGE)).toBeLessThan(0.03);
    expect(
      result.candidates.every(
        (candidate) => tripletDeltaE(candidate.color, '60 30% 90%') > 0.05
      )
    ).toBe(true);
  });

  it('clusters JPEG-like noise on the background away', () => {
    let noise = 7;
    const jitter = () => {
      noise = (noise * 1103515245 + 12345) % 2147483648;
      return (noise % 7) - 3;
    };
    const logo = image(64, 64, (x, y) => {
      const [r, g, b] =
        x > 20 && x < 44 && y > 20 && y < 44 ? rgba(TEAL) : rgba('0 0% 97%');
      return [r + jitter(), g + jitter(), b + jitter(), 255];
    });
    const result = analyzeLogoPixels(logo);
    expect(tripletDeltaE(result.seeds!.primary, TEAL)).toBeLessThan(0.03);
    expect(result.flags).not.toContain('noisyBackground');
  });

  it('flags a genuinely noisy (non-uniform) opaque background instead of guessing', () => {
    const logo = image(64, 64, (x, y) =>
      x > 20 && x < 44 && y > 20 && y < 44
        ? rgba(BLUE)
        : rgba(`${(x * 23 + y * 7) % 360} 70% 50%`)
    );
    expect(analyzeLogoPixels(logo).flags).toContain('noisyBackground');
  });

  it('monochrome: black/grey mark → darkest colour as an ink brand', () => {
    const result = analyzeLogoPixels(
      image(64, 64, stripes(['0 0% 8%', '0 0% 55%'], [0.6, 0.4]))
    );
    expect(result.flags).toContain('monochrome');
    expect(tripletDeltaE(result.seeds!.primary, '0 0% 8%')).toBeLessThan(0.03);
    expect(result.seeds!.secondary).toBeUndefined();
  });

  it('multi-colour: the right top three by weight, and distinguishable', () => {
    const colours = [BLUE, ORANGE, TEAL, '330 75% 55%', '50 90% 50%'];
    const result = analyzeLogoPixels(
      image(64, 64, stripes(colours, [0.4, 0.25, 0.15, 0.12, 0.08]))
    );
    expect(tripletDeltaE(result.seeds!.primary, BLUE)).toBeLessThan(0.03);
    expect(tripletDeltaE(result.seeds!.secondary!, ORANGE)).toBeLessThan(0.03);
    expect(result.seeds!.accent).toBeDefined();
    expect(result.candidates).toHaveLength(5);
  });

  it('single-hue logos are flagged (the deriver fills by harmony)', () => {
    const result = analyzeLogoPixels(
      image(64, 64, stripes([BLUE, '221 83% 30%'], [0.5, 0.5]))
    );
    expect(result.flags).toContain('singleHue');
  });

  it('neon seeds are flagged', () => {
    expect(
      analyzeLogoPixels(image(64, 64, stripes(['66 100% 50%'], [1]))).flags
    ).toContain('neonSeed');
  });

  it('an empty (fully transparent) image yields no seeds', () => {
    const result = analyzeLogoPixels(image(32, 32, () => null));
    expect(result).toEqual({ seeds: null, candidates: [], flags: ['empty'] });
  });

  it('is deterministic', () => {
    const logo = image(64, 64, stripes([BLUE, ORANGE, TEAL], [0.5, 0.3, 0.2]));
    expect(analyzeLogoPixels(logo)).toEqual(analyzeLogoPixels(logo));
  });

  it('rejects malformed and oversized buffers instead of decoding them', () => {
    expect(() =>
      analyzeLogoPixels({
        data: new Uint8ClampedArray(10),
        width: 4,
        height: 4,
      })
    ).toThrow();
    expect(() =>
      analyzeLogoPixels({ data: new Uint8ClampedArray(0), width: 0, height: 0 })
    ).toThrow();
    const edge = MAX_ANALYSIS_EDGE + 1;
    expect(() =>
      analyzeLogoPixels({
        data: new Uint8ClampedArray(edge * 4),
        width: edge,
        height: 1,
      })
    ).toThrow();
  });

  it('analyses a 128×128 logo quickly (well inside the 500 ms budget)', () => {
    const logo = image(128, 128, (x, y) =>
      rgba(
        `${Math.floor((x / 128) * 360)} 70% ${30 + Math.floor((y / 128) * 40)}%`
      )
    );
    const started = performance.now();
    analyzeLogoPixels(logo);
    expect(performance.now() - started).toBeLessThan(500);
  });

  it('reports candidates in the stored triplet format', () => {
    const result = analyzeLogoPixels(image(64, 64, stripes([BLUE], [1])));
    expect(result.candidates[0]).toEqual({
      color: formatHslTriplet(hslToRgb(221, 83, 53)),
      share: 1,
      class: 'chromatic',
    });
  });
});
