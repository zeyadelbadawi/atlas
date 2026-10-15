/**
 * Home feature — the platform host's public pages — public entry point.
 *
 * Deliberately tiny: the holding page (`holding/`, owner decision D6) and
 * the contact page are lazy routes and never imported across features.
 * What IS shared is the sign-up's "intended plan" storage key, consumed
 * (then cleared) by the one-page sign-up in `@features/auth`.
 */
export { INTENDED_PLAN_STORAGE_KEY } from './utils/intended-plan';
