/**
 * Plain helpers for Manara's section renderers (no components here, so the
 * component modules keep fast refresh): the stagger for a group's
 * entrance, paragraph splitting and the theme's course images.
 */

/** A group rises with a 60ms stagger, capped at 400ms in total (plan §3.12). */
export const stagger = (index: number): number => Math.min(index * 60, 400);

/** Paragraphs are separated by a blank line; single breaks stay inside one. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

/** The poster for a course without its own thumbnail (plan §3.13). */
export const MANARA_COURSE_FALLBACK = 'theme-asset:manara/course-fallback';
/** The plate of the featured-courses empty state. */
export const MANARA_COURSES_LAUNCHING = 'theme-asset:manara/courses-launching';
