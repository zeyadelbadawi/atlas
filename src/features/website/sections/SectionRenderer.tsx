/**
 * Section Renderer — the dispatcher.
 *
 * The ONE place a `SectionInstance` is turned into UI. Every page/preview
 * renders sections through this component; nothing else `switch`es on
 * `SectionInstance.type`. Adding a 12th section type means adding one
 * `case` here and one component file — never touching an existing case.
 */
import { HeroSection } from './HeroSection';
import { AboutSection } from './AboutSection';
import { FeaturedCoursesSection } from './FeaturedCoursesSection';
import { StatisticsSection } from './StatisticsSection';
import { FeaturesSection } from './FeaturesSection';
import { TestimonialsSection } from './TestimonialsSection';
import { FaqSection } from './FaqSection';
import { CtaSection } from './CtaSection';
import { InstructorsSection } from './InstructorsSection';
import { GallerySection } from './GallerySection';
import { ContactSection } from './ContactSection';
import type { SectionInstance } from '@types';

export interface SectionRendererProps {
  readonly instance: SectionInstance;
  readonly academyId: string;
}

export function SectionRenderer({ instance, academyId }: SectionRendererProps): JSX.Element | null {
  if (!instance.enabled) return null;

  switch (instance.type) {
    case 'hero':
      return <HeroSection config={instance.config} />;
    case 'about':
      return <AboutSection config={instance.config} />;
    case 'featuredCourses':
      return <FeaturedCoursesSection config={instance.config} academyId={academyId} />;
    case 'statistics':
      return <StatisticsSection config={instance.config} />;
    case 'features':
      return <FeaturesSection config={instance.config} />;
    case 'testimonials':
      return <TestimonialsSection config={instance.config} academyId={academyId} />;
    case 'faq':
      return <FaqSection config={instance.config} academyId={academyId} />;
    case 'cta':
      return <CtaSection config={instance.config} />;
    case 'instructors':
      return <InstructorsSection config={instance.config} academyId={academyId} />;
    case 'gallery':
      return <GallerySection config={instance.config} />;
    case 'contact':
      return <ContactSection config={instance.config} />;
    default:
      return null;
  }
}
