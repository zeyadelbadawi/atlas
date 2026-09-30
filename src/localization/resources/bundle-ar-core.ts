/**
 * Arabic translations an Academy website needs for its first paint.

The namespaces used by every module on the public route's first-paint
path (determined from the build's module graph; Reports/LCP_ROOT_CAUSE.md,
fix D). Loaded before the site renders; `bundle-ar-rest.ts` follows
right after. The dashboard loads both before rendering.
 */
import arCommon from './ar/common.json';
import arNavigation from './ar/navigation.json';
import arValidation from './ar/validation.json';
import arErrors from './ar/errors.json';
import arCourse from './ar/course.json';
import arLearning from './ar/learning.json';
import arLegal from './ar/legal.json';
import arWebsite from './ar/website.json';
import arPublicWebsite from './ar/publicWebsite.json';

const bundle: Record<string, Record<string, unknown>> = {
  common: arCommon,
  navigation: arNavigation,
  validation: arValidation,
  errors: arErrors,
  course: arCourse,
  learning: arLearning,
  legal: arLegal,
  website: arWebsite,
  publicWebsite: arPublicWebsite,
};

export default bundle;
