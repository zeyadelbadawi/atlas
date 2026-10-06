/**
 * Every theme-asset version folder that has ever been released (plan §E.3
 * step 8). Released folders are immutable and never deleted: pages and
 * caches may reference them forever. The manifest test fails if a folder
 * listed here disappears, or if a released entry points at a folder that
 * isn't listed. Add `<theme>/<version>` here in the same commit that adds
 * the files.
 */
export const RELEASED_THEME_ASSET_FOLDERS: readonly string[] = [
  'modern-education/v1',
  'atelier/v1',
  'atelier/v2',
  'atelier/v3',
  'modern-education/v2',
  'manara/v1',
];
