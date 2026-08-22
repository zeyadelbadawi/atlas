/**
 * Testimonials Section.
 */
import { Quote } from 'lucide-react';
import {
  useWebsiteCardClass,
  useWebsiteContainerClass,
  useWebsiteHeadingClass,
  useWebsiteSectionClass,
} from '../renderer/renderer-style.utils';
import type { TestimonialsSectionConfig } from '@types';

export interface TestimonialsSectionProps {
  readonly config: TestimonialsSectionConfig;
}

export function TestimonialsSection({ config }: TestimonialsSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();
  const cardClass = useWebsiteCardClass();

  return (
    <section className={`${container} ${section}`}>
      {config.title ? (
        <h2 className={`${heading} mb-10 text-center text-3xl text-foreground`}>{config.title}</h2>
      ) : null}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {config.items.map((item) => (
          <figure key={item.id} className={cardClass}>
            <Quote className="size-5 text-[var(--website-primary-solid)]" aria-hidden />
            <blockquote className="mt-3 text-sm leading-relaxed text-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              {item.avatar ? (
                <img src={item.avatar} alt="" className="size-9 rounded-full object-cover" />
              ) : null}
              <div>
                <p className="text-sm font-medium text-foreground">{item.authorName}</p>
                {item.authorRole ? (
                  <p className="text-xs text-muted-foreground">{item.authorRole}</p>
                ) : null}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
