/**
 * Blog validation schemas.
 */
import { z } from 'zod';
import {
  MAX_BLOG_CONTENT_LENGTH,
  MAX_BLOG_EXCERPT_LENGTH,
  MAX_BLOG_SLUG_LENGTH,
  MAX_BLOG_TITLE_LENGTH,
} from '../constants/blog.constants';

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const blogPostSchema = z.object({
  title: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_BLOG_TITLE_LENGTH, 'validation:maxLength'),
  slug: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_BLOG_SLUG_LENGTH, 'validation:maxLength')
    .regex(SLUG_REGEX, 'validation:invalidSlug'),
  excerpt: z
    .string()
    .max(MAX_BLOG_EXCERPT_LENGTH, 'validation:maxLength')
    .optional(),
  content: z
    .string()
    .min(1, 'validation:required')
    .max(MAX_BLOG_CONTENT_LENGTH, 'validation:maxLength'),
  featuredImage: z.string().optional(),
  category: z.string().optional(),
  tags: z.string().optional(),
});

export type BlogPostFormData = z.infer<typeof blogPostSchema>;
