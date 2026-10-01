/**
 * The website overview's launch checklist (Theme 1 plan Phase 7, §D.4).
 *
 * Three steps between a freshly generated website and a live one, each
 * derived from the Academy's real, saved state — never a stored "done"
 * flag that could drift:
 *   1. Brand colours confirmed (the palette's own `status`);
 *   2. No sample testimonials left — the same list the publish warning
 *      shows, each with a link to review it;
 *   3. The website is published.
 * Guidance only: nothing here blocks publishing.
 */
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import { isUsablePalette } from '../theme-packs/brand-palette.utils';
import { collectSampleContent } from '../utils/sample-content.utils';
import { SampleContentList } from './SampleContentList';
import type { WebsiteConfiguration, WebsitePage } from '@types';

interface ChecklistStep {
  readonly id: 'brand' | 'samples' | 'publish';
  readonly done: boolean;
  readonly titleKey: string;
  readonly descriptionKey: string;
  readonly action?: { readonly labelKey: string; readonly to: string };
  readonly children?: React.ReactNode;
}

export function WebsiteLaunchChecklist({
  academyId,
  configuration,
  pages,
}: {
  readonly academyId: string;
  readonly configuration: WebsiteConfiguration;
  readonly pages: readonly WebsitePage[];
}): JSX.Element {
  const { t } = useTranslation();
  const palette = configuration.brand.palette;
  const brandConfirmed =
    isUsablePalette(palette) && palette.status === 'confirmed';
  const samples = collectSampleContent(pages);
  const sampleCount = samples.reduce(
    (total, entry) => total + entry.sampleItems,
    0
  );
  const published = configuration.status === 'published';

  const steps: readonly ChecklistStep[] = [
    {
      id: 'brand',
      done: brandConfirmed,
      titleKey: 'website:launchChecklist.brand.title',
      descriptionKey: brandConfirmed
        ? 'website:launchChecklist.brand.done'
        : 'website:launchChecklist.brand.todo',
      action: brandConfirmed
        ? undefined
        : {
            labelKey: 'website:launchChecklist.brand.action',
            to: `${buildPath(DASHBOARD_ROUTES.websiteSettings, { academyId })}?tab=brand`,
          },
    },
    {
      id: 'samples',
      done: samples.length === 0,
      titleKey: 'website:launchChecklist.samples.title',
      descriptionKey:
        samples.length === 0
          ? 'website:launchChecklist.samples.done'
          : 'website:launchChecklist.samples.todo',
      children:
        samples.length > 0 ? (
          <SampleContentList academyId={academyId} entries={samples} />
        ) : null,
    },
    {
      id: 'publish',
      done: published,
      titleKey: 'website:launchChecklist.publish.title',
      descriptionKey: published
        ? 'website:launchChecklist.publish.done'
        : 'website:launchChecklist.publish.todo',
    },
  ];
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <Card data-testid="website-launch-checklist">
      <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-2 space-y-0">
        <CardTitle className="text-base">
          {t('website:launchChecklist.title')}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t('website:launchChecklist.progress', {
            done: doneCount,
            total: steps.length,
          })}
        </p>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {steps.map((step) => {
            const Icon = step.done ? CheckCircle2 : Circle;
            return (
              <li
                key={step.id}
                data-step={step.id}
                data-done={step.done}
                className="flex gap-3"
              >
                <Icon
                  className={
                    step.done
                      ? 'mt-0.5 size-5 shrink-0 text-success'
                      : 'mt-0.5 size-5 shrink-0 text-muted-foreground'
                  }
                  aria-hidden
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {t(step.titleKey)}
                      <span className="sr-only">
                        {' — '}
                        {t(
                          step.done
                            ? 'website:launchChecklist.stateDone'
                            : 'website:launchChecklist.stateTodo'
                        )}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t(step.descriptionKey, { count: sampleCount })}
                    </p>
                  </div>
                  {step.children}
                  {step.action ? (
                    <Link
                      to={step.action.to}
                      className="inline-flex min-h-9 items-center rounded-md border border-border px-3 text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {t(step.action.labelKey)}
                    </Link>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
