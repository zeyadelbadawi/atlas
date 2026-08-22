/**
 * CTA (call-to-action banner) Section.
 */
import { Button } from '@/components/ui/button';
import { useWebsiteContainerClass, useWebsiteHeadingClass, useWebsiteSectionClass } from '../renderer/renderer-style.utils';
import type { CtaSectionConfig } from '@types';

export interface CtaSectionProps {
  readonly config: CtaSectionConfig;
}

export function CtaSection({ config }: CtaSectionProps): JSX.Element {
  const container = useWebsiteContainerClass();
  const section = useWebsiteSectionClass();
  const heading = useWebsiteHeadingClass();

  return (
    <section className={section}>
      <div
        className={`${container} flex flex-col items-center gap-4 py-16 text-center text-white`}
        style={{
          backgroundColor: 'var(--website-primary-solid)',
          borderRadius: 'var(--website-radius)',
        }}
      >
        <h2 className={`${heading} text-3xl`}>{config.title}</h2>
        {config.description ? (
          <p className="max-w-xl opacity-90">{config.description}</p>
        ) : null}
        <Button size="lg" variant="secondary">
          {config.cta.label}
        </Button>
      </div>
    </section>
  );
}
