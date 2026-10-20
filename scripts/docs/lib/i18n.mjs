// Resolves the text values used in shot specs (locator names, waitFor
// texts) in the capture language:
//   - an i18n key `namespace:key.path` → the string in
//     src/localization/resources/<lang>/<namespace>.json, turned into a
//     RegExp whose `{{interpolation}}` and `<0>…</0>` parts match anything;
//   - `{ en: "...", ar: "..." }` → that language's literal;
//   - any other string → itself, for both languages.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

export class SpecError extends Error {}

const KEY_RE = /^([A-Za-z][A-Za-z0-9_-]*):([A-Za-z0-9_][A-Za-z0-9_.-]*)$/;
const PLURAL_SUFFIXES = ['', '_other', '_one', '_zero', '_two', '_few', '_many'];

export function createI18n(resourcesDir) {
  const cache = new Map();
  const load = (lang, ns) => {
    const k = `${lang}/${ns}`;
    if (!cache.has(k)) {
      const file = path.join(resourcesDir, lang, `${ns}.json`);
      cache.set(k, existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : null);
    }
    return cache.get(k);
  };
  const lookup = (obj, dotted) => dotted.split('.').reduce((o, part) => (o && typeof o === 'object' ? o[part] : undefined), obj);

  /** The raw translation for `ns:key` in `lang`, or throws SpecError. */
  function translate(key, lang) {
    const m = KEY_RE.exec(key);
    if (!m) throw new SpecError(`not an i18n key: ${key}`);
    const [, ns, dotted] = m;
    const res = load(lang, ns);
    if (!res) throw new SpecError(`unknown i18n namespace "${ns}" (${key})`);
    for (const suffix of PLURAL_SUFFIXES) {
      const v = lookup(res, dotted + suffix);
      if (typeof v === 'string') return v;
    }
    throw new SpecError(`unknown i18n key ${key} (${lang})`);
  }

  /** True when `value` looks like `ns:key` and `ns` is a real namespace. */
  function isKey(value) {
    const m = typeof value === 'string' && KEY_RE.exec(value);
    return !!m && !!load('en', m[1]);
  }

  /**
   * The matcher for a spec text value in `lang`: a string (literal) or a
   * RegExp (translation with dynamic parts). `exact` anchors it;
   * `anchorKeys` anchors translations only (accessible names and labels
   * are the whole translated string, so "Account number" must not match
   * "Copy account number").
   */
  function matcher(value, lang, { exact = false, anchorKeys = false } = {}) {
    let text;
    let fromKey = false;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (typeof value[lang] !== 'string') throw new SpecError(`literal text has no "${lang}" value: ${JSON.stringify(value)}`);
      text = value[lang];
    } else if (typeof value === 'string') {
      if (isKey(value)) {
        text = translate(value, lang);
        fromKey = true;
      } else text = value;
    } else {
      throw new SpecError(`expected a text value, got ${JSON.stringify(value)}`);
    }
    if (fromKey && anchorKeys) exact = true;
    const dynamic = /\{\{[^}]*\}\}|<\/?[A-Za-z0-9]+>|\$t\(/.test(text);
    if (!fromKey && !dynamic && !exact) return text;
    const parts = text
      .replace(/<\/?[A-Za-z0-9]+>/g, '') // <Trans> component markers
      .split(/\{\{[^}]*\}\}|\$t\([^)]*\)/)
      .map((p) => p.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+'));
    const body = parts.filter((p, i) => p || i === 0 || i === parts.length - 1).join('.+?') || '.+';
    // Anchored, tolerating a required-field marker ("Account number *").
    return new RegExp(exact ? `^\\s*${body}\\s*\\*?\\s*$` : body, 'i');
  }

  return { translate, isKey, matcher };
}
