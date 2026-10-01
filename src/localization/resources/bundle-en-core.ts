/**
 * English translations an Academy website needs for its first paint.

The namespaces used by every module on the public route's first-paint
path (determined from the build's module graph; Reports/LCP_ROOT_CAUSE.md,
fix D). Loaded before the site renders; `bundle-en-rest.ts` follows
right after. The dashboard loads both before rendering.
 */
import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enValidation from './en/validation.json';
import enErrors from './en/errors.json';
import enCourse from './en/course.json';
import enLearning from './en/learning.json';
import enLegal from './en/legal.json';
import enWebsite from './en/website.json';
import enPublicWebsite from './en/publicWebsite.json';

const bundle: Record<string, Record<string, unknown>> = {
  common: enCommon,
  navigation: enNavigation,
  validation: enValidation,
  errors: enErrors,
  course: enCourse,
  learning: enLearning,
  legal: enLegal,
  website: enWebsite,
  publicWebsite: enPublicWebsite,
};

export default bundle;
