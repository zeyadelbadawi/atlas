/**
 * The protection badge — AD-16's capability object, rendered honestly
 * (§E.3).
 *
 * THIS COMPONENT EXISTS TO NOT LIE. The field it replaced was a
 * `'protected' | 'unprotected'` union derived from whether the content
 * was an external embed, so a Normal-tier video, a Premium-tier video and
 * a protected PDF all reported the same word — and after finding D-5,
 * "protected" was actively misleading for Premium, whose delivery edge
 * does not re-check the session the token was issued to. One word cannot
 * describe two tiers that differ on which of them is stronger, so this
 * renders the FACTS the delivering adapter reported and lets the learner
 * read them.
 *
 * THREE RULES, ALL OF THEM DELIBERATE:
 *
 * 1. NO MARKETING WORD. Never "secure", never "safe", never "protected"
 *    as a verdict. §I is explicit that the tiers are sold as
 *    self-managed versus platform-managed delivery and never as "less
 *    secure" versus "secure", because on session binding and revocation
 *    the Normal tier is the STRONGER of the two.
 * 2. NEVER CLAIM DRM. `drm` is typed `false` on the wire and this renders
 *    the fact as its own line rather than omitting it: a learner (or an
 *    auditor) should be told that screen recording is not prevented,
 *    because neither tier prevents it and §6.1 forbids claiming
 *    otherwise.
 * 3. SAY IT PLAINLY WHEN SOMETHING IS NOT ENFORCED. `boundToDevice:
 *    false` gets a sentence of its own, in the same type size as the
 *    things that ARE enforced. Hiding the negatives and listing only the
 *    positives is the same lie as the old badge, told more carefully.
 *
 * A `null` tier is not "no protection": text, files and resources travel
 * the same authenticated, entitlement-checked, signed and short-lived
 * channel — they simply have no video capabilities to report. Only an
 * EXTERNAL embed reports `signedUrl: false`, and that one is labelled as
 * unprotected in as many words, because Atlas does not host it and cannot
 * protect it.
 */
import { useTranslation } from 'react-i18next';
import { Check, Info, Minus, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@utils';
import type { ContentProtectionReport } from '@types';

export interface ProtectionReportProps {
  readonly protection: ContentProtectionReport;
  readonly className?: string;
}

/** One fact, and whether it is actually in force. */
interface ProtectionFact {
  readonly key: string;
  readonly enforced: boolean;
}

/** Minutes, rounded down, because "expires in 0 minutes" is more honest than "in 1". */
function remainingMinutes(seconds: number): number {
  return Math.max(0, Math.floor(seconds / 60));
}

function buildFacts(
  protection: ContentProtectionReport
): readonly ProtectionFact[] {
  return [
    { key: 'signedUrl', enforced: protection.signedUrl },
    { key: 'boundToSession', enforced: protection.boundToSession },
    { key: 'boundToDevice', enforced: protection.boundToDevice },
    { key: 'revocable', enforced: protection.revocableBeforeExpiry },
    { key: 'originRestricted', enforced: protection.originRestricted },
    { key: 'watermark', enforced: protection.watermark },
  ];
}

export function ProtectionReport({
  protection,
  className,
}: ProtectionReportProps): JSX.Element {
  const { t } = useTranslation();
  const facts = buildFacts(protection);
  const isExternal = !protection.signedUrl;

  /*
   * The trigger's own label is the only thing visible without opening the
   * popover, so it says what KIND of delivery this is — never how good it
   * is. An external embed is the one case where a single word is both
   * accurate and important enough to show unopened.
   */
  const triggerLabel = isExternal
    ? t('learning:player.protection.badge.external')
    : protection.tier
      ? t(`learning:player.protection.tier.${protection.tier}`)
      : t('learning:player.protection.badge.atlasHosted');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-auto gap-1.5 px-2 py-1 text-xs', className)}
        >
          {isExternal ? (
            <ShieldQuestion className="size-3.5" aria-hidden />
          ) : (
            <Info className="size-3.5" aria-hidden />
          )}
          <span>{triggerLabel}</span>
          <span className="sr-only">
            {t('learning:player.protection.badge.openDetails')}
          </span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <h3 className="font-display text-sm font-semibold text-foreground">
          {t('learning:player.protection.title')}
        </h3>

        {isExternal ? (
          <p className="mt-2 text-xs text-muted-foreground">
            {t('learning:player.protection.externalNotice')}
          </p>
        ) : (
          <>
            {protection.tier ? (
              <Badge variant="outline" className="mt-2">
                {t(`learning:player.protection.tier.${protection.tier}`)}
              </Badge>
            ) : null}

            <p className="mt-2 text-xs text-muted-foreground">
              {t('learning:player.protection.expiresIn', {
                minutes: remainingMinutes(protection.expiresInSeconds),
              })}
            </p>

            <ul className="mt-3 space-y-2">
              {facts.map((fact) => (
                <li key={fact.key} className="flex items-start gap-2 text-xs">
                  {/* Icon + text, never icon alone: the sentence beside it
                      already states the fact, so the glyph is decoration
                      and is hidden from assistive technology. */}
                  {fact.enforced ? (
                    <Check
                      className="mt-0.5 size-3.5 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : (
                    <Minus
                      className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                  )}
                  <span
                    className={
                      fact.enforced ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {t(
                      `learning:player.protection.fact.${fact.key}.${
                        fact.enforced ? 'yes' : 'no'
                      }`
                    )}
                  </span>
                </li>
              ))}

              {/*
                DRM is its own row, outside the loop, because it is the one
                fact that is not read from the adapter: `drm` is typed as
                the literal `false` on the wire (neither tier has it, and
                Cloudflare Stream does not offer it at all — D1), so there
                is no "yes" case to render and no translated sentence
                claiming one is allowed to exist in the bundle.
              */}
              <li className="flex items-start gap-2 text-xs">
                <Minus
                  className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
                <span className="text-muted-foreground">
                  {t('learning:player.protection.noDrm')}
                </span>
              </li>
            </ul>

            {/* The closing sentence is the one §6.1 requires: what NEITHER
                tier can claim. It is not a caveat in small print — it is
                the most important thing on this panel. */}
            <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
              {t('learning:player.protection.limits')}
            </p>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
