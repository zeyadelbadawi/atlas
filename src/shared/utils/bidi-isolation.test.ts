/**
 * RTL sweep — the shared bidi mechanisms.
 *
 *   1. ALIGNMENT. `src/index.css` gives every `dir="auto"` element (and
 *      every `dir="ltr"` value) `text-align: match-parent`, so a Latin value
 *      in an Arabic table cell / key-value row lines up with its header
 *      instead of sitting at the left. Chromium only parses the `-webkit-`
 *      spelling, so both must be present; form controls and code are out.
 *   2. ISOLATION. `isolateValues` / `isolateTextIn` wrap user values for a
 *      translated sentence in FSI…PDI — in RTL only, never i18next's option
 *      keys (a plural must still pluralise), never non-text values.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import {
  directionOf,
  isolateText,
  isolateTextIn,
  isolateValues,
} from './bidi.utils';

const FSI = '⁨';
const PDI = '⁩';

describe('alignment follows the layout (index.css)', () => {
  const css = readFileSync(resolve(__dirname, '../../index.css'), 'utf8');
  const start = css.indexOf(':where(\n    [dir=');
  const rule = css.slice(start, css.indexOf('}', start) + 1);

  it('declares match-parent for dir="auto" and LTR values, both spellings', () => {
    expect(start).toBeGreaterThan(-1);
    expect(rule).toContain("[dir='auto']");
    expect(rule).toContain("[dir='ltr'][data-ltr-content]");
    for (const cell of ['th', 'td', 'dt', 'dd']) {
      expect(rule).toContain(`${cell}[dir='ltr']`);
    }
    // Chromium parses only the prefixed value; Firefox/Safari the standard
    // one. Prefixed first so the standard one wins where both parse.
    const prefixed = rule.indexOf('text-align: -webkit-match-parent;');
    const standard = rule.indexOf('text-align: match-parent;');
    expect(prefixed).toBeGreaterThan(-1);
    expect(standard).toBeGreaterThan(prefixed);
  });

  it('leaves form controls and code alone, at zero specificity', () => {
    expect(rule.trimStart().startsWith(':where(')).toBe(true);
    expect(rule).toMatch(
      /:not\(input, textarea, select, pre, code, kbd, samp, \[contenteditable\]\)/
    );
  });

  it('sits in the base layer, so any explicit alignment utility wins', () => {
    const baseLayer = css.lastIndexOf('@layer base {', start);
    const utilities = css.indexOf('@layer utilities {');
    expect(baseLayer).toBeGreaterThan(-1);
    expect(start).toBeGreaterThan(baseLayer);
    expect(start).toBeLessThan(utilities);
  });
});

describe('isolateTextIn / isolateValues', () => {
  it('isolates in RTL and is a no-op in LTR (English output unchanged)', () => {
    expect(isolateTextIn('rtl', 'Ziad Elbadawi')).toBe(
      `${FSI}Ziad Elbadawi${PDI}`
    );
    expect(isolateTextIn('ltr', 'Ziad Elbadawi')).toBe('Ziad Elbadawi');
    expect(isolateTextIn('rtl', '')).toBe('');
  });

  it('wraps only values with letters, never numbers or i18next option keys', () => {
    const values = {
      name: 'Ziad',
      count: 3,
      context: 'male',
      defaultValue: 'x',
      score: 92,
      formatted: '٣',
      amount: '1,250.00',
      empty: '',
    };
    expect(isolateValues(values, 'rtl')).toEqual({
      name: isolateText('Ziad'),
      count: 3,
      context: 'male',
      defaultValue: 'x',
      score: 92,
      formatted: '٣',
      amount: '1,250.00',
      empty: '',
    });
    expect(isolateValues(values, 'ltr')).toBe(values);
  });

  it('keeps plural selection working through a real Arabic instance', () => {
    const ar = createI18nInstance('ar');
    const plain = ar.t('tenant:startTrial.subtitle', {
      plan: 'Growth',
      count: 14,
    });
    const isolated = ar.t(
      'tenant:startTrial.subtitle',
      isolateValues({ plan: 'Growth', count: 14 }, 'rtl')
    );
    // Same plural form, the plan name merely sealed in an isolate.
    expect(isolated.replace(/[⁨⁩]/g, '')).toBe(plain);
    expect(isolated).toContain(`${FSI}Growth${PDI}`);
  });

  it('reads the direction from an i18next instance, tolerating a partial one', () => {
    expect(directionOf(createI18nInstance('ar'))).toBe('rtl');
    expect(directionOf(createI18nInstance('en'))).toBe('ltr');
    expect(directionOf({})).toBe('ltr');
    expect(directionOf(undefined)).toBe('ltr');
  });
});
