/**
 * Forensic watermark codes on the client — must agree with the backend
 * rule (`atlas-backend/src/forensic-watermark/utils/watermark-code.util.ts`
 * and its spec) symbol for symbol: same alphabet, same mod-37 check, same
 * normalisation. A disagreement would either send codes the server rejects
 * or, worse, block a real code before it is ever looked up.
 *
 * The known-good codes below were derived with the backend's algorithm
 * (nine data symbols + the Crockford mod-37 check symbol).
 */
import { describe, expect, it } from 'vitest';
import {
  CROCKFORD_ALPHABET,
  WATERMARK_CODE_EXAMPLE,
  crockfordCheckSymbol,
  crockfordCheckValue,
  formatPartialWatermarkCode,
  formatWatermarkCode,
  invalidWatermarkSymbols,
  isValidWatermarkCode,
  normalizeWatermarkCode,
} from './watermark-code.utils';

/** Valid codes: data + check symbol, computed with the backend algorithm. */
const VALID = [
  '7K3QMX9TR7',
  '012345678V',
  'ABCDEFGHJE',
  'X1Y0Z2W3V4',
  'M4N5P6Q7R9',
  '100000000G',
] as const;

describe('Crockford mod-37 check', () => {
  it('uses the Crockford alphabet (no I, L, O or U)', () => {
    expect(CROCKFORD_ALPHABET).toBe('0123456789ABCDEFGHJKMNPQRSTVWXYZ');
    expect(CROCKFORD_ALPHABET).not.toMatch(/[ILOU]/);
  });

  it.each([
    ['7K3QMX9TR', 7, '7'],
    ['012345678', 27, 'V'],
    ['ABCDEFGHJ', 14, 'E'],
    ['100000000', 16, 'G'],
    // Check values 32–36 map to the extra symbols the backend never issues.
    ['100110000', 32, '*'],
  ])('%s → check value %i (%s)', (data, value, symbol) => {
    expect(crockfordCheckValue(data)).toBe(value);
    expect(crockfordCheckSymbol(data)).toBe(symbol);
  });

  it('refuses a symbol outside the alphabet', () => {
    expect(() => crockfordCheckValue('ABCU')).toThrow();
  });
});

describe('formatting', () => {
  it('formats as two groups of five', () => {
    expect(formatWatermarkCode('7K3QMX9TR7')).toBe('7K3QM-X9TR7');
  });

  it('leaves anything that is not ten symbols unchanged', () => {
    expect(formatWatermarkCode('7K3QM')).toBe('7K3QM');
  });

  it('groups a partially typed code', () => {
    expect(formatPartialWatermarkCode('7K3')).toBe('7K3');
    expect(formatPartialWatermarkCode('7K3QMX9')).toBe('7K3QM-X9');
  });

  it('shows an example that is itself a valid code', () => {
    expect(isValidWatermarkCode(WATERMARK_CODE_EXAMPLE)).toBe(true);
  });
});

describe('normalizeWatermarkCode', () => {
  it.each(VALID)('accepts %s', (code) => {
    expect(normalizeWatermarkCode(code)).toEqual({
      ok: true,
      code,
      display: formatWatermarkCode(code),
    });
  });

  it('accepts the display form and other separators', () => {
    for (const input of [
      '7K3QM-X9TR7',
      '7K3QM X9TR7',
      '7K3QM.X9TR7',
      '7K3QM_X9TR7',
      '7K3QM/X9TR7',
      '7K3QM–X9TR7',
      '  7 K 3 Q M - X 9 T R 7  ',
    ]) {
      expect(normalizeWatermarkCode(input), input).toMatchObject({
        ok: true,
        code: '7K3QMX9TR7',
        display: '7K3QM-X9TR7',
      });
    }
  });

  it('is case-insensitive', () => {
    expect(normalizeWatermarkCode('7k3qm-x9tr7')).toMatchObject({
      ok: true,
      code: '7K3QMX9TR7',
    });
  });

  it('reads O as 0 and I or L as 1 (Crockford aliases)', () => {
    expect(normalizeWatermarkCode('OI234-5678V')).toMatchObject({
      ok: true,
      code: '012345678V',
    });
    expect(normalizeWatermarkCode('ol234-5678v')).toMatchObject({
      ok: true,
      code: '012345678V',
    });
    expect(normalizeWatermarkCode('LOOOO-OOOOG')).toMatchObject({
      ok: true,
      code: '100000000G',
    });
  });

  it('mirrors the backend spec: lower case, spaced, O/L aliases', () => {
    // The backend spec's "messy" transform of a valid code.
    for (const code of VALID) {
      const display = formatWatermarkCode(code);
      const messy =
        ` ${display.toLowerCase().replace(/0/g, 'o').replace(/1/g, 'l')} `
          .split('')
          .join(' ');
      expect(normalizeWatermarkCode(messy)).toEqual({
        ok: true,
        code,
        display,
      });
    }
  });

  it('reads Arabic-Indic and Extended Arabic-Indic digits as Latin digits', () => {
    expect(normalizeWatermarkCode('٠١٢٣٤-٥٦٧٨V')).toMatchObject({
      ok: true,
      code: '012345678V',
    });
    expect(normalizeWatermarkCode('۰۱۲۳۴-۵۶۷۸v')).toMatchObject({
      ok: true,
      code: '012345678V',
    });
    expect(normalizeWatermarkCode('٧K٣QM-X٩TR٧')).toMatchObject({
      ok: true,
      code: '7K3QMX9TR7',
    });
  });

  it('reports a single misread symbol as a checksum problem, at every position', () => {
    for (const code of VALID) {
      for (let position = 0; position < code.length; position += 1) {
        for (const symbol of CROCKFORD_ALPHABET) {
          if (symbol === code[position]) continue;
          const misread =
            code.slice(0, position) + symbol + code.slice(position + 1);
          expect(normalizeWatermarkCode(misread), misread).toMatchObject({
            ok: false,
            problem: 'checksum',
            normalized: misread,
          });
        }
      }
    }
  });

  it('catches the classic recording misreads 5/S and 8/B', () => {
    // `S` and `B` are real symbols, so these are checksum failures, not
    // "invalid symbol" — exactly why the page names them.
    expect(
      normalizeWatermarkCode('012345678V'.replace('5', 'S'))
    ).toMatchObject({ ok: false, problem: 'checksum' });
    expect(
      normalizeWatermarkCode('012345678V'.replace('8', 'B'))
    ).toMatchObject({ ok: false, problem: 'checksum' });
  });

  it('reports two adjacent symbols swapped as a checksum problem', () => {
    const code = '7K3QMX9TR7';
    for (let position = 0; position < code.length - 1; position += 1) {
      if (code[position] === code[position + 1]) continue;
      const swapped =
        code.slice(0, position) +
        code[position + 1] +
        code[position] +
        code.slice(position + 2);
      expect(normalizeWatermarkCode(swapped), swapped).toMatchObject({
        ok: false,
        problem: 'checksum',
      });
    }
  });

  it('reports empty, length and symbol problems (backend spec vectors)', () => {
    expect(normalizeWatermarkCode('')).toMatchObject({
      ok: false,
      problem: 'empty',
    });
    expect(normalizeWatermarkCode(' - . ')).toMatchObject({
      ok: false,
      problem: 'empty',
    });
    expect(normalizeWatermarkCode('ABC')).toMatchObject({
      ok: false,
      problem: 'length',
      normalized: 'ABC',
    });
    expect(normalizeWatermarkCode('7K3QM-X9TR77')).toMatchObject({
      ok: false,
      problem: 'length',
    });
    expect(normalizeWatermarkCode('ABCDEFGHU0')).toMatchObject({
      ok: false,
      problem: 'symbol',
    });
  });

  it('never accepts a code whose check would need * ~ $ = U', () => {
    // `100110000` has check value 32 (`*`): no issued code ends in it.
    expect(normalizeWatermarkCode('100110000*')).toMatchObject({
      ok: false,
      problem: 'symbol',
    });
    expect(normalizeWatermarkCode('100110000U')).toMatchObject({
      ok: false,
      problem: 'symbol',
    });
  });
});

describe('helpers', () => {
  it('isValidWatermarkCode agrees with normalizeWatermarkCode', () => {
    expect(isValidWatermarkCode('7k3qm x9tr7')).toBe(true);
    expect(isValidWatermarkCode('7K3QM-X9TR2')).toBe(false);
    expect(isValidWatermarkCode('')).toBe(false);
  });

  it('lists the impossible characters once each, in order', () => {
    expect(invalidWatermarkSymbols('AU#U1')).toEqual(['U', '#']);
    expect(invalidWatermarkSymbols('7K3QMX9TR7')).toEqual([]);
  });
});
