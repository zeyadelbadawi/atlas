/**
 * English translation bundle — every namespace (core + rest), for tests and
 * tooling that need a whole language synchronously. The app loads the two
 * halves itself (`language-resources.ts`).
 */
import core from './bundle-en-core';
import rest from './bundle-en-rest';

const bundle: Record<string, Record<string, unknown>> = { ...core, ...rest };

export default bundle;
