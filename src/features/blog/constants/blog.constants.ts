/**
 * Blog feature constants.
 */

export const MAX_BLOG_TITLE_LENGTH = 150;
export const MAX_BLOG_SLUG_LENGTH = 150;
export const MAX_BLOG_EXCERPT_LENGTH = 300;
export const MAX_BLOG_CONTENT_LENGTH = 20000;

/** 5MB — matches the course thumbnail's base64-encoded image constant. */
export const MAX_BLOG_FEATURED_IMAGE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_BLOG_FEATURED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
];
