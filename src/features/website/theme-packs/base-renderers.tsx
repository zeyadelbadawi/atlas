/**
 * Base renderers: the shared, theme-neutral renderer for every section type
 * (Theme 1 plan §F.1). Any pack that doesn't redesign a type gets this one,
 * so a section added by one theme still renders after a theme switch.
 *
 * Each entry adapts the uniform `SectionRenderProps` to the section
 * component's own props. `linkRenderer` is present only on the public
 * runtime, so it doubles as the "is this the public site" signal (e.g. the
 * testimonials' sample filter, plan §D.4).
 */
import { HeroSection } from '../sections/HeroSection';
import { AboutSection } from '../sections/AboutSection';
import { FeaturedCoursesSection } from '../sections/FeaturedCoursesSection';
import { StatisticsSection } from '../sections/StatisticsSection';
import { FeaturesSection } from '../sections/FeaturesSection';
import { TestimonialsSection } from '../sections/TestimonialsSection';
import { FaqSection } from '../sections/FaqSection';
import { CtaSection } from '../sections/CtaSection';
import { InstructorsSection } from '../sections/InstructorsSection';
import { GallerySection } from '../sections/GallerySection';
import { ContactSection } from '../sections/ContactSection';
import { CourseCatalogSection } from '../sections/CourseCatalogSection';
import { PageHeaderSection } from '../sections/PageHeaderSection';
import { CourseCategoriesSection } from '../sections/CourseCategoriesSection';
import { StepsSection } from '../sections/StepsSection';
import { FeatureSplitSection } from '../sections/FeatureSplitSection';
import { CourseSpotlightSection } from '../sections/CourseSpotlightSection';
import type { SectionRenderers } from './theme-pack.types';

export const BASE_RENDERERS: SectionRenderers = {
  hero: function BaseHero({ config, pages, linkRenderer }) {
    return (
      <HeroSection config={config} pages={pages} linkRenderer={linkRenderer} />
    );
  },
  about: function BaseAbout({ config }) {
    return <AboutSection config={config} />;
  },
  featuredCourses: function BaseFeaturedCourses({
    config,
    academyId,
    linkRenderer,
  }) {
    return (
      <FeaturedCoursesSection
        config={config}
        academyId={academyId}
        linkRenderer={linkRenderer}
      />
    );
  },
  statistics: function BaseStatistics({ config, academyId }) {
    return <StatisticsSection config={config} academyId={academyId} />;
  },
  features: function BaseFeatures({ config }) {
    return <FeaturesSection config={config} />;
  },
  testimonials: function BaseTestimonials({ config, academyId, linkRenderer }) {
    return (
      <TestimonialsSection
        config={config}
        academyId={academyId}
        isPublic={!!linkRenderer}
      />
    );
  },
  faq: function BaseFaq({ config, academyId, pages, linkRenderer }) {
    return (
      <FaqSection
        config={config}
        academyId={academyId}
        pages={pages}
        linkRenderer={linkRenderer}
      />
    );
  },
  cta: function BaseCta({ config, pages, linkRenderer }) {
    return (
      <CtaSection config={config} pages={pages} linkRenderer={linkRenderer} />
    );
  },
  instructors: function BaseInstructors({ config, academyId }) {
    return <InstructorsSection config={config} academyId={academyId} />;
  },
  gallery: function BaseGallery({ config }) {
    return <GallerySection config={config} />;
  },
  contact: function BaseContact({ config, academyId }) {
    return <ContactSection config={config} academyId={academyId} />;
  },
  courseCatalog: function BaseCourseCatalog({
    config,
    academyId,
    linkRenderer,
  }) {
    return (
      <CourseCatalogSection
        config={config}
        academyId={academyId}
        linkRenderer={linkRenderer}
      />
    );
  },
  pageHeader: function BasePageHeader({ config }) {
    return <PageHeaderSection config={config} />;
  },
  courseCategories: function BaseCourseCategories({
    config,
    academyId,
    pages,
    linkRenderer,
  }) {
    return (
      <CourseCategoriesSection
        config={config}
        academyId={academyId}
        pages={pages}
        linkRenderer={linkRenderer}
      />
    );
  },
  steps: function BaseSteps({ config }) {
    return <StepsSection config={config} />;
  },
  featureSplit: function BaseFeatureSplit({ config, pages, linkRenderer }) {
    return (
      <FeatureSplitSection
        config={config}
        pages={pages}
        linkRenderer={linkRenderer}
      />
    );
  },
  courseSpotlight: function BaseCourseSpotlight({
    config,
    academyId,
    pages,
    linkRenderer,
  }) {
    return (
      <CourseSpotlightSection
        config={config}
        academyId={academyId}
        pages={pages}
        linkRenderer={linkRenderer}
      />
    );
  },
};
