/**
 * The lookup page before any code is submitted: how to read a code off a
 * leaked recording, with an illustration of the overlay as the player
 * draws it (the moving label plus the faint tiled copy).
 */
import { useTranslation } from 'react-i18next';
import { Hash, Pause, ScanSearch, type LucideIcon } from 'lucide-react';
import { SectionCard } from '@components/layout';
import { WATERMARK_CODE_EXAMPLE } from '../utils/watermark-code.utils';

const K = 'platform:watermarkLookup';
/** The masked account hint the player draws next to the code (illustration only). */
const SAMPLE_MASKED_IDENTITY = 'l•••@gmail.com';

const STEPS: readonly { readonly key: string; readonly icon: LucideIcon }[] = [
  { key: 'pause', icon: Pause },
  { key: 'read', icon: Hash },
  { key: 'enter', icon: ScanSearch },
];

export function WatermarkLookupIdle(): JSX.Element {
  const { t } = useTranslation();

  return (
    <SectionCard
      titleKey={`${K}.idle.title`}
      descriptionKey={`${K}.idle.description`}
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center">
        <figure className="space-y-2">
          {/* Decorative mock of a paused video frame; the caption says what it is. */}
          <div
            aria-hidden
            className="relative aspect-video overflow-hidden rounded-lg bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 shadow-inner ring-1 ring-border"
          >
            <div
              dir="ltr"
              data-ltr-content
              className="absolute inset-[-25%] flex rotate-[-18deg] flex-wrap content-around justify-around gap-x-10 gap-y-6 font-mono text-[0.625rem] tracking-widest text-white/[0.07]"
            >
              {Array.from({ length: 24 }, (_, index) => (
                <span key={index}>{WATERMARK_CODE_EXAMPLE}</span>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white/70">
                <Pause className="size-5" />
              </span>
            </div>
            <div
              dir="ltr"
              data-ltr-content
              className="absolute bottom-[18%] end-[8%] rounded bg-black/35 px-2 py-1 font-mono text-xs leading-tight text-white/80 sm:text-sm"
            >
              <span className="block tracking-widest">
                {WATERMARK_CODE_EXAMPLE}
              </span>
              <span className="block text-[0.625rem] text-white/60 sm:text-xs">
                {SAMPLE_MASKED_IDENTITY}
              </span>
            </div>
          </div>
          <figcaption className="text-center text-xs text-muted-foreground">
            {t(`${K}.idle.sampleCaption`)}
          </figcaption>
        </figure>

        <ol className="space-y-4">
          {STEPS.map(({ key, icon: Icon }, index) => (
            <li key={key} className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"
                aria-hidden
              >
                <Icon className="size-4" />
              </span>
              <div className="min-w-0 space-y-0.5">
                <p className="text-sm font-semibold text-foreground">
                  <span className="sr-only">{index + 1}. </span>
                  {t(`${K}.idle.steps.${key}.title`)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t(`${K}.idle.steps.${key}.body`)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </SectionCard>
  );
}
