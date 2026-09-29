/**
 * Base renderers: the shared, theme-neutral renderer for every section type
 * (Theme 1 plan §F.1). Any pack that doesn't redesign a type gets this one,
 * so a section added by one theme still renders after a theme switch.
 *
 * Each entry adapts the uniform `SectionRenderProps` to the section
 * component's own props — the components themselves are unchanged.
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
  testimonials: function BaseTestimonials({ config, academyId }) {
    return <TestimonialsSection config={config} academyId={academyId} />;
  },
  faq: function BaseFaq({ config, academyId }) {
    return <FaqSection config={config} academyId={academyId} />;
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
};
