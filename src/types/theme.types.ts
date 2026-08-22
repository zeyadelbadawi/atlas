/**
 * Theme contracts.
 *
 * Light Mode and Dark Mode are both primary experiences. `system` follows the
 * operating system preference and reacts to changes while the app is open.
 */

/** The theme a user selects. */
export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;

export type ThemePreference = (typeof THEME_PREFERENCES)[number];

/** The theme actually applied to the document after resolving `system`. */
export type ResolvedTheme = 'light' | 'dark';