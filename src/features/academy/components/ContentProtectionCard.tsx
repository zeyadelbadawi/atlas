/**
 * Content protection card (P64 Phase 2, D8; forensic watermark).
 *
 * NOTHING HERE IS A SETTING ANY MORE, AND THE CARD SAYS SO. The forensic
 * watermark is mandatory on every video an Atlas player shows (backend
 * `docs/FORENSIC_WATERMARK.md`): each learner sees their own code and a
 * masked hint of their account moving over the picture, plus a faint
 * pattern of the code across the whole frame, and a leaked recording can be
 * traced to the account and session it came from. The server ignores the
 * old `watermark` / `watermarkText` fields, so a switch here would save
 * something that changes nothing — the worst kind of control.
 *
 * The player deterrents were already shown, not offered (the learner grant
 * never carried them and the player always applies the stronger default);
 * they are listed with the watermark as what every learner gets.
 *
 * Still Client Owner only, like the other protection cards in this
 * section, so a Manager sees the same explanation on all three.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Fingerprint, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProtectionOwnerOnlyNotice } from './ProtectionOwnerOnlyNotice';

export interface ContentProtectionCardProps {
  readonly academyId: string;
  /** Whether the viewer may see the protection details (Client Owner). */
  readonly canEdit: boolean;
}

const DETERRENTS = [
  'fullscreen',
  'tamper',
  'download',
  'pip',
  'contextMenu',
] as const;

export function ContentProtectionCard({
  canEdit,
}: ContentProtectionCardProps): JSX.Element {
  const { t } = useTranslation();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:protection.content.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:protection.content.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {canEdit ? <ContentProtectionSummary /> : <ProtectionOwnerOnlyNotice />}
      </CardContent>
    </Card>
  );
}

function ContentProtectionSummary(): JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <section
        className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4"
        aria-labelledby="content-protection-watermark"
      >
        <Fingerprint
          className="mt-0.5 size-5 shrink-0 text-primary"
          strokeWidth={1.75}
          aria-hidden
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="content-protection-watermark"
              className="text-sm font-semibold"
            >
              {t('academy:protection.content.watermark.label')}
            </h3>
            <Badge variant="secondary">
              {t('academy:protection.content.watermark.badge')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('academy:protection.content.watermark.description')}
          </p>
          <p className="text-sm text-muted-foreground">
            {t('academy:protection.content.watermark.leak')}
          </p>
        </div>
      </section>

      <section
        className="space-y-2"
        aria-labelledby="content-protection-deterrents"
      >
        <h3 id="content-protection-deterrents" className="text-sm font-medium">
          {t('academy:protection.content.deterrents.title')}
        </h3>
        <ul className="space-y-2">
          {DETERRENTS.map((key) => (
            <li
              key={key}
              className="flex items-start gap-3 rounded-lg border border-border p-3"
            >
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-success"
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-sm font-medium">
                  {t(`academy:protection.content.deterrents.${key}.label`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(
                    `academy:protection.content.deterrents.${key}.description`
                  )}
                </p>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {t('academy:protection.content.deterrents.alwaysOn')}
              </span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground">
          {t('academy:protection.content.deterrents.note')}
        </p>
      </section>
    </div>
  );
}
