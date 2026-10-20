/**
 * Home feature — the platform host's public pages — public entry point.
 *
 * Deliberately tiny: the contact page is a lazy route and never imported
 * across features (the marketing home is the static site, `src/marketing/`).
 * What IS shared is the sign-up's "intended plan" storage key, consumed
 * (then cleared) by the one-page sign-up in `@features/auth`.
 */
export { INTENDED_PLAN_STORAGE_KEY } from './utils/intended-plan';
