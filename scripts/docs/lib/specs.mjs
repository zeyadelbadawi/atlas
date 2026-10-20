// Loads and validates content/docs/shots/*.yaml (see scripts/docs/README.md).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parse } from 'yaml';
import { SpecError } from './i18n.mjs';

export const ROLES = ['owner', 'manager', 'instructor', 'learner', 'learner2', 'visitor'];
export const SURFACES = ['dashboard', 'academy', 'platform'];
export const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false, widths: [960, 1440] },
  mobile: { width: 390, height: 844, mobile: true, widths: [390, 780] },
};
const KEY_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ACTIONS = ['click', 'fill', 'hover', 'press', 'scroll', 'wait'];
const TOP_FIELDS = ['key', 'as', 'surface', 'path', 'viewport', 'waitFor', 'actions', 'highlight', 'mask', 'clip', 'fullPage', 'note'];

/** Stable JSON (sorted object keys) for hashing. */
export function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}
export const specHash = (entry) => createHash('sha1').update(stableStringify(entry)).digest('hex');

function checkLocator(where, loc) {
  if (!loc || typeof loc !== 'object' || Array.isArray(loc)) throw new SpecError(`${where}: expected a locator object`);
  const kinds = ['role', 'text', 'label', 'testId', 'selector'].filter((k) => k in loc);
  if (kinds.length !== 1) throw new SpecError(`${where}: a locator needs exactly one of role/text/label/testId/selector (got ${kinds.join(', ') || 'none'})`);
  if ('nth' in loc && !Number.isInteger(loc.nth)) throw new SpecError(`${where}: nth must be an integer`);
}

export function validateEntry(entry, file) {
  const where = `${path.basename(file)}: ${entry?.key ?? '(no key)'}`;
  if (!entry || typeof entry !== 'object') throw new SpecError(`${where}: entry must be a mapping`);
  for (const k of Object.keys(entry)) if (!TOP_FIELDS.includes(k)) throw new SpecError(`${where}: unknown field "${k}"`);
  if (!KEY_RE.test(entry.key ?? '')) throw new SpecError(`${where}: key must be <category>/<name> in lowercase-hyphen`);
  if (!ROLES.includes(entry.as)) throw new SpecError(`${where}: as must be one of ${ROLES.join(', ')}`);
  if (!SURFACES.includes(entry.surface)) throw new SpecError(`${where}: surface must be one of ${SURFACES.join(', ')}`);
  if (typeof entry.path !== 'string' || !entry.path.startsWith('/')) throw new SpecError(`${where}: path must start with /`);
  if (entry.viewport !== undefined && !VIEWPORTS[entry.viewport]) throw new SpecError(`${where}: viewport must be desktop or mobile`);
  if (entry.waitFor !== undefined) {
    if (!entry.waitFor || (!('text' in entry.waitFor) && !('selector' in entry.waitFor))) throw new SpecError(`${where}: waitFor needs text or selector`);
  }
  for (const [i, action] of (entry.actions ?? []).entries()) {
    const names = Object.keys(action ?? {});
    if (names.length !== 1 || !ACTIONS.includes(names[0])) throw new SpecError(`${where}: actions[${i}] must be one of ${ACTIONS.join(', ')}`);
    const [name] = names;
    const arg = action[name];
    if (name === 'wait') {
      if (!Number.isInteger(arg) || arg < 0 || arg > 2000) throw new SpecError(`${where}: wait takes 0–2000 ms`);
    } else if (name === 'press') {
      if (typeof arg !== 'string' && !(arg && typeof arg.key === 'string')) throw new SpecError(`${where}: press takes a key name or { key, ...locator }`);
      if (arg && typeof arg === 'object' && Object.keys(arg).length > 1) {
        const { key: _key, ...loc } = arg;
        checkLocator(`${where}: actions[${i}]`, loc);
      }
    } else if (name === 'scroll') {
      if (!arg || (typeof arg.y !== 'number' && Object.keys(arg).length === 0)) throw new SpecError(`${where}: scroll takes a locator or { y }`);
      if (typeof arg.y !== 'number') checkLocator(`${where}: actions[${i}]`, arg);
    } else {
      const { value, ...loc } = arg ?? {};
      checkLocator(`${where}: actions[${i}]`, loc);
      if (name === 'fill' && typeof value !== 'string' && !(value && typeof value === 'object')) throw new SpecError(`${where}: fill needs a value`);
    }
  }
  const highlights = entry.highlight === undefined ? [] : Array.isArray(entry.highlight) ? entry.highlight : [entry.highlight];
  highlights.forEach((h, i) => checkLocator(`${where}: highlight[${i}]`, h));
  // `mask`: elements painted over in the capture (a QR code, a secret key).
  const masks = entry.mask === undefined ? [] : Array.isArray(entry.mask) ? entry.mask : [entry.mask];
  masks.forEach((m, i) => checkLocator(`${where}: mask[${i}]`, m));
  if (entry.clip !== undefined && typeof entry.clip !== 'string' && !(entry.clip && typeof entry.clip === 'object')) throw new SpecError(`${where}: clip must be "dialog", a CSS selector or a locator`);
  if (entry.clip && typeof entry.clip === 'object') checkLocator(`${where}: clip`, entry.clip);
  return entry;
}

/** Every entry of every shots file, validated; duplicate keys are an error. */
export function loadSpecs(shotsDir) {
  if (!existsSync(shotsDir)) throw new SpecError(`no shots folder at ${shotsDir}`);
  const entries = [];
  const seen = new Map();
  for (const file of readdirSync(shotsDir).filter((f) => /\.ya?ml$/.test(f)).sort()) {
    const full = path.join(shotsDir, file);
    const doc = parse(readFileSync(full, 'utf8')) ?? [];
    if (!Array.isArray(doc)) throw new SpecError(`${file}: must be a YAML list of shots`);
    for (const raw of doc) {
      const entry = validateEntry(raw, full);
      if (seen.has(entry.key)) throw new SpecError(`duplicate key ${entry.key} (${seen.get(entry.key)} and ${file})`);
      seen.set(entry.key, file);
      entries.push({ ...entry, file, hash: specHash(raw) });
    }
  }
  return entries;
}

/** `{academyId}` → state.academyId; an unknown placeholder fails the shot. */
export function fillPlaceholders(text, state) {
  return text.replace(/\{([A-Za-z][A-Za-z0-9_]*)\}/g, (_, name) => {
    const v = state[name];
    if (typeof v !== 'string' && typeof v !== 'number') {
      throw new SpecError(`unknown placeholder {${name}} (not in seed/state.json — see scripts/docs/README.md for the list)`);
    }
    return encodeURIComponent(String(v));
  });
}
