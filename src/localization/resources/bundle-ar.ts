/**
 * Arabic translation bundle — every namespace (core + rest), for tests and
 * tooling that need a whole language synchronously. The app loads the two
 * halves itself (`language-resources.ts`).
 */
import core from './bundle-ar-core';
import rest from './bundle-ar-rest';

const bundle: Record<string, Record<string, unknown>> = { ...core, ...rest };

export default bundle;
