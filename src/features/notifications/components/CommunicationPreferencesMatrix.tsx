/**
 * Communication preferences matrix.
 *
 * One row per category, each with a one-line description of what it
 * covers, and — for the three LOCKED categories — an "Always on" pill
 * with a lock and a tooltip saying WHY rather than a disabled switch. A
 * greyed-out switch reads as "broken" or "not for you"; a pill reads as
 * a decision, which is what it is: security, receipts and account
 * changes are not optional because a person cannot be safe without them.
 * The lock comes from the contract's own `locked: true`, never from a
 * list of category names kept here.
 *
 * TWO MODES, ONE COMPONENT. `personal` is a person's own inbox (`/my/profile`,
 * `/dashboard/profile`). `defaults` is the platform page — what a NEW
 * account starts with — and the same rows are shown so that an operator
 * setting the default sees exactly what the person will see. The data
 * behind the two differs (the defaults page still runs on the legacy
 * channel triple), which is why this component is a pure `value`/`onChange`
 * view and each parent owns its own fetching.
 *
 * EVERY CONTROL IS DESCRIBED. Each switch and select carries
 * `aria-describedby` pointing at its row's description, so a screen
 * reader hears "Updates and announcements — announcements, discussions
 * and new content in your courses — switch, on", not "switch, on".
 *
 * Optimism belongs to the parent: this component renders the value it is
 * given, and reports what changed as the exact PATCH body.
 */
import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@utils';
import type {
  CommunicationCategoryId,
  CommunicationDigest,
  CommunicationLanguage,
  CommunicationPreferences,
  CommunicationPreferencesUpdate,
} from '@types';

export type CommunicationPreferencesMatrixMode = 'personal' | 'defaults';

export interface CommunicationPreferencesMatrixProps {
  readonly value: CommunicationPreferences;
  /** Reports the exact PATCH body for what changed. */
  readonly onChange: (update: CommunicationPreferencesUpdate) => void;
  readonly mode?: CommunicationPreferencesMatrixMode;
  /** Disables every mutable control while a change is saving. */
  readonly isPending?: boolean;
  /** The email-language select. Off on the defaults page, which has no such field. */
  readonly showLanguage?: boolean;
  /** Digest selects. Off when the backing data has no digest. */
  readonly showDigest?: boolean;
  /** The lifecycle reminders switch. Off when the backing data has no such field. */
  readonly showReminders?: boolean;
  readonly className?: string;
}

/** Declaration order is display order: the locked rows first, so the pattern reads top-down. */
const CATEGORY_ORDER: readonly CommunicationCategoryId[] = [
  'security',
  'transactional',
  'lifecycle',
  'engagement',
  'operational',
];

const ENGAGEMENT_DIGESTS: readonly CommunicationDigest[] = [
  'immediate',
  'daily',
  'off',
];
const OPERATIONAL_DIGESTS: readonly Exclude<CommunicationDigest, 'off'>[] = [
  'immediate',
  'daily',
];

function AlwaysOnPill({ reasonKey }: { readonly reasonKey: string }): JSX.Element {
  const { t } = useTranslation();

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Lock className="size-3.5" strokeWidth={2} aria-hidden />
          {t('notifications:communication.alwaysOn')}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs text-start">
          {t(reasonKey)}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface RowProps {
  readonly id: CommunicationCategoryId;
  readonly descriptionId: string;
  readonly children: ReactNode;
  /** A second line of controls under the row (the lifecycle reminders switch). */
  readonly footer?: ReactNode;
}

function CategoryRow({ id, descriptionId, children, footer }: RowProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <li className="space-y-3 py-4 first:pt-0 last:pb-0">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium text-foreground">
            {t(`notifications:communication.categories.${id}.title`)}
          </p>
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {t(`notifications:communication.categories.${id}.description`)}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-3 sm:justify-end">
          {children}
        </div>
      </div>
      {footer}
    </li>
  );
}

export function CommunicationPreferencesMatrix({
  value,
  onChange,
  mode = 'personal',
  isPending = false,
  showLanguage = true,
  showDigest = true,
  showReminders = true,
  className,
}: CommunicationPreferencesMatrixProps): JSX.Element {
  const { t } = useTranslation();
  const baseId = useId();
  const descriptionId = (id: string) => `${baseId}-${id}-description`;
  const lockedReasonKey =
    mode === 'defaults'
      ? 'notifications:communication.lockedReasonDefaults'
      : 'notifications:communication.lockedReason';
  const { categories } = value;

  const categoryName = (id: CommunicationCategoryId) =>
    t(`notifications:communication.categories.${id}.title`);

  return (
    <div className={cn('space-y-6', className)}>
      {showLanguage ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <Label htmlFor={`${baseId}-language`}>
              {t('notifications:communication.emailLanguage')}
            </Label>
            <p
              id={descriptionId('language')}
              className="text-sm text-muted-foreground"
            >
              {t('notifications:communication.emailLanguageDescription')}
            </p>
          </div>
          <Select
            value={value.language}
            onValueChange={(next) =>
              onChange({ language: next as CommunicationLanguage })
            }
            disabled={isPending}
          >
            <SelectTrigger
              id={`${baseId}-language`}
              aria-describedby={descriptionId('language')}
              className="w-full sm:w-44"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('common:languages.en')}</SelectItem>
              <SelectItem value="ar">{t('common:languages.ar')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <ul
        className="divide-y divide-border"
        aria-label={t('notifications:communication.title')}
      >
        {CATEGORY_ORDER.map((id) => {
          const category = categories[id];
          // A learner has no operational surface: the contract says so
          // with `null`, and the row is simply absent rather than shown
          // greyed as if something were missing.
          if (!category) return null;

          if ('locked' in category && category.locked) {
            const isLifecycle = id === 'lifecycle';
            return (
              <CategoryRow
                key={id}
                id={id}
                descriptionId={descriptionId(id)}
                footer={
                  isLifecycle && showReminders ? (
                    <div className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 sm:ms-4">
                      <div className="space-y-0.5">
                        <Label
                          htmlFor={`${baseId}-lifecycle-reminders`}
                          className="font-normal"
                        >
                          {t('notifications:communication.reminders')}
                        </Label>
                        <p
                          id={descriptionId('lifecycle-reminders')}
                          className="text-xs text-muted-foreground"
                        >
                          {t('notifications:communication.remindersDescription')}
                        </p>
                      </div>
                      <Switch
                        id={`${baseId}-lifecycle-reminders`}
                        checked={categories.lifecycle.reminders}
                        onCheckedChange={(checked) =>
                          onChange({ lifecycle: { reminders: checked } })
                        }
                        disabled={isPending}
                        aria-describedby={descriptionId('lifecycle-reminders')}
                      />
                    </div>
                  ) : null
                }
              >
                <AlwaysOnPill reasonKey={lockedReasonKey} />
              </CategoryRow>
            );
          }

          if (id === 'engagement') {
            const engagement = categories.engagement;
            return (
              <CategoryRow key={id} id={id} descriptionId={descriptionId(id)}>
                {showDigest ? (
                  <Select
                    value={engagement.digest}
                    onValueChange={(next) =>
                      onChange({
                        engagement: {
                          email: engagement.email,
                          digest: next as CommunicationDigest,
                        },
                      })
                    }
                    disabled={isPending || !engagement.email}
                  >
                    <SelectTrigger
                      aria-label={t('notifications:communication.digestLabel', {
                        category: categoryName(id),
                      })}
                      aria-describedby={descriptionId(id)}
                      className="w-full sm:w-40"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ENGAGEMENT_DIGESTS.map((digest) => (
                        <SelectItem key={digest} value={digest}>
                          {t(`notifications:communication.digest.${digest}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : null}
                <Switch
                  checked={engagement.email}
                  onCheckedChange={(checked) =>
                    onChange({
                      engagement: { email: checked, digest: engagement.digest },
                    })
                  }
                  disabled={isPending}
                  aria-label={t('notifications:communication.emailToggle', {
                    category: categoryName(id),
                  })}
                  aria-describedby={descriptionId(id)}
                />
              </CategoryRow>
            );
          }

          // Operational — the only remaining mutable category. Read again
          // by name so the type narrows to its own shape.
          const operational = categories.operational;
          if (!operational) return null;
          return (
            <CategoryRow key={id} id={id} descriptionId={descriptionId(id)}>
              {showDigest ? (
                <Select
                  value={operational.digest}
                  onValueChange={(next) =>
                    onChange({
                      operational: {
                        email: operational.email,
                        digest: next as Exclude<CommunicationDigest, 'off'>,
                      },
                    })
                  }
                  disabled={isPending || !operational.email}
                >
                  <SelectTrigger
                    aria-label={t('notifications:communication.digestLabel', {
                      category: categoryName(id),
                    })}
                    aria-describedby={descriptionId(id)}
                    className="w-full sm:w-40"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATIONAL_DIGESTS.map((digest) => (
                      <SelectItem key={digest} value={digest}>
                        {t(`notifications:communication.digest.${digest}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Switch
                checked={operational.email}
                onCheckedChange={(checked) =>
                  onChange({
                    operational: { email: checked, digest: operational.digest },
                  })
                }
                disabled={isPending}
                aria-label={t('notifications:communication.emailToggle', {
                  category: categoryName(id),
                })}
                aria-describedby={descriptionId(id)}
              />
            </CategoryRow>
          );
        })}
      </ul>
    </div>
  );
}

/** The matrix's loading shape — the same rows, so nothing jumps when data lands. */
export function CommunicationPreferencesMatrixSkeleton({
  rows = 4,
  className,
}: {
  readonly rows?: number;
  readonly className?: string;
}): JSX.Element {
  const { t } = useTranslation();

  return (
    <div
      role="status"
      aria-label={t('notifications:communication.loading')}
      className={cn('space-y-4', className)}
    >
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-full max-w-md" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full" />
        </div>
      ))}
    </div>
  );
}
