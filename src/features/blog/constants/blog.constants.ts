/**
 * Blog feature constants.
 */

export const MAX_BLOG_TITLE_LENGTH = 150;
export const MAX_BLOG_SLUG_LENGTH = 150;
export const MAX_BLOG_EXCERPT_LENGTH = 300;
export const MAX_BLOG_CONTENT_LENGTH = 20000;

/** Phase 6 — SEO metadata. `metaTitle` at 70 and `metaDescription` at 200 match the backend DTO's own `@MaxLength` (search-engine display truncation points), not arbitrary UI limits. */
export const MAX_BLOG_META_TITLE_LENGTH = 70;
export const MAX_BLOG_META_DESCRIPTION_LENGTH = 200;

/** 5MB — matches the course thumbnail's base64-encoded image constant. */
export const MAX_BLOG_FEATURED_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_BLOG_FEATURED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
