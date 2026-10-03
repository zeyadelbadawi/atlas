/**
 * A JSON key that two equal values always share, whatever order their
 * object keys arrive in.
 *
 * The page editor decided "unsaved changes" with `JSON.stringify`, which is
 * key-order sensitive: a section the server echoed back with its config
 * keys in a different order than the form produced them read as an edit
 * nobody made, and "Leave without saving?" appeared on an untouched page.
 * Arrays keep their order — reordering sections IS an edit.
 */
export function stableJsonKey(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) {
      // `undefined` is dropped by JSON anyway; dropping it here keeps
      // `{a: undefined}` and `{}` equal, as they are once saved.
      if (source[key] !== undefined) sorted[key] = normalize(source[key]);
    }
    return sorted;
  }
  return value;
}
