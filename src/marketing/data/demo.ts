/**
 * The demo academy shown in the screenshots (fictional; local stack only).
 * Shown in the browser frame so the capture reads as an academy on its own
 * Atlas subdomain.
 */
export const DEMO_ACADEMY_HOST = 'al-nour.atlass.dpdns.org';

/**
 * Whether `DEMO_ACADEMY_HOST` is a real, published academy on production.
 * It is not yet (B0-OC-29): the host answers "Website not found", so the
 * /resources "Open the demo academy" section stays hidden until it is.
 * Set to `true` in the same change that publishes the demo academy.
 */
export const DEMO_ACADEMY_LIVE = false;
