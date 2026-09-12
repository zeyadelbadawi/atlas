/**
 * Hero figure — the Atlas structure, drawn from real product concepts.
 *
 * WHY THIS IS NOT A SCREENSHOT. The repository contains no product screenshots
 * (`public/` holds only `favicon.svg`), and inventing a mock dashboard image
 * would be fabricated product evidence — it would show an interface that may
 * not match what a visitor actually gets. So this figure deliberately shows
 * *structure* rather than pretending to be a captured UI: the real
 * Organization → Academy → (courses · students · website) hierarchy that Atlas
 * genuinely implements, which is exactly what the hero copy claims.
 *
 * It carries NO numbers. Every metric in a marketing hero is either real data
 * or a fabricated statistic, and there is no real tenant data to show on an
 * unauthenticated page — so it shows labels only.
 *
 * Built from the same design tokens as the product (`border`, `card`,
 * `primary`, `muted-foreground`), so it stays correct in Light and Dark Mode
 * and flips correctly under RTL without a mirrored asset.
 */
import { BookOpen, Building2, Globe2, Network, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AcademyLeaf {
  readonly id: string;
  readonly icon: LucideIcon;
}

/** The three things every Atlas academy really gets. Order is display order. */
const ACADEMY_LEAVES: readonly AcademyLeaf[] = [
  { id: 'courses', icon: BookOpen },
  { id: 'students', icon: Users },
  { id: 'website', icon: Globe2 },
];

function AcademyNode({ label }: { readonly label: string }): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2.5">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Building2 className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="truncate font-display text-sm font-semibold text-foreground">
          {label}
        </span>
      </div>

      <ul className="mt-3 space-y-1.5">
        {ACADEMY_LEAVES.map((leaf) => (
          <li
            key={leaf.id}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <leaf.icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">
              {t(`home:structure.leaves.${leaf.id}`)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlatformStructureFigure(): JSX.Element {
  const { t } = useTranslation();

  return (
    <figure className="m-0">
      <div className="rounded-xl border border-border bg-surface p-5 shadow-xs sm:p-6">
        {/* Organization — the root every academy hangs off. */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Network className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block font-display text-sm font-semibold text-foreground">
              {t('home:structure.organization.title')}
            </span>
            <span className="block text-xs text-muted-foreground">
              {t('home:structure.organization.caption')}
            </span>
          </span>
        </div>

        {/*
          The connector. A single vertical hairline in the inline-start gutter
          plus one rule per child — CSS only, so it mirrors automatically in RTL
          (`start`/`ms` logical properties, never `left`/`ml`).
        */}
        <div className="relative mt-3 ps-5">
          <span
            className="absolute inset-y-0 start-2 w-px bg-border"
            aria-hidden
          />
          <ul className="space-y-3">
            {['first', 'second'].map((slot) => (
              <li key={slot} className="relative">
                <span
                  className="absolute -start-3 top-8 h-px w-3 bg-border"
                  aria-hidden
                />
                <AcademyNode label={t(`home:structure.academies.${slot}`)} />
              </li>
            ))}
          </ul>
        </div>
      </div>

      <figcaption className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t('home:structure.caption')}
      </figcaption>
    </figure>
  );
}
