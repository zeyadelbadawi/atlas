/**
 * B3 — which language versions a post has: an EN and an AR chip, each with
 * a check or a dash and a full accessible name ("Arabic version missing"),
 * so completeness is never conveyed by colour alone.
 */
import { Check, Minus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@utils';
import type { BlogLocale } from '../types';
import { K } from '../utils/launch.utils';

export function LanguageBadges({
  complete,
}: {
  readonly complete: Readonly<Record<BlogLocale, boolean>>;
}): JSX.Element {
  const { t } = useTranslation();
  return (
    <span className="inline-flex gap-1.5">
      {(['en', 'ar'] as const).map((locale) => {
        const ok = complete[locale];
        const language = t(
          `${K}common.${locale === 'en' ? 'english' : 'arabic'}`
        );
        return (
          <span
            key={locale}
            className={cn(
              'inline-flex items-center gap-1 rounded-pill border px-2 py-0.5 text-xs font-medium',
              ok
                ? 'border-success/30 bg-success-surface text-success'
                : 'border-border bg-muted text-muted-foreground'
            )}
          >
            {ok ? (
              <Check className="size-3" aria-hidden />
            ) : (
              <Minus className="size-3" aria-hidden />
            )}
            <span aria-hidden>{t(`${K}blog.languageBadge.${locale}`)}</span>
            <span className="sr-only">
              {t(`${K}blog.languageBadge.${ok ? 'complete' : 'missing'}`, {
                language,
              })}
            </span>
          </span>
        );
      })}
    </span>
  );
}
