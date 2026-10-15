/**
 * B0-IAM-08 / B0-ANL-04 — two read-only facts on the Platform Owner's
 * organization detail:
 *
 *   - the owner's WhatsApp number, shown ONLY when the server returned it,
 *     which it does only for an owner who opted in at sign-up (with when,
 *     and which consent wording version). Otherwise a plain "not shared"
 *     line — the console never hints at a number it was not given;
 *   - where the sign-up came from (UTM source / medium / campaign, referrer
 *     host, landing template), when it was captured.
 */
import { useTranslation } from 'react-i18next';
import { useDateFormatter } from '@hooks';
import type { PlatformOrganizationOwnerPhone } from '@types';

const SOURCE_KEYS = [
  'utmSource',
  'utmMedium',
  'utmCampaign',
  'utmTerm',
  'utmContent',
  'referrerDomain',
  'landingTemplate',
] as const;

export interface OrganizationOwnerContactDetailsProps {
  readonly ownerPhone?: PlatformOrganizationOwnerPhone;
  readonly signupAttribution?: Readonly<Record<string, string>> | null;
}

export function OrganizationOwnerContactDetails({
  ownerPhone,
  signupAttribution,
}: OrganizationOwnerContactDetailsProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const sources = SOURCE_KEYS.filter((key) => signupAttribution?.[key]);

  return (
    <>
      <div className="space-y-1" data-testid="platform-org-owner-phone">
        <p className="text-xs text-muted-foreground">
          {t('platform:organizations.ownerWhatsapp.label')}
        </p>
        {ownerPhone ? (
          <>
            <p className="text-sm text-foreground" dir="ltr" data-ltr-content>
              {ownerPhone.e164}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('platform:organizations.ownerWhatsapp.optedIn', {
                date: fmt.date(ownerPhone.whatsappConsentAt),
                version: ownerPhone.whatsappConsentVersion,
              })}
            </p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('platform:organizations.ownerWhatsapp.notShared')}
          </p>
        )}
      </div>
      <div className="space-y-1" data-testid="platform-org-signup-source">
        <p className="text-xs text-muted-foreground">
          {t('platform:organizations.signupSource.label')}
        </p>
        {sources.length > 0 ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            {sources.map((key) => (
              <div key={key} className="contents">
                <dt className="text-xs text-muted-foreground">
                  {t(`platform:organizations.signupSource.fields.${key}`)}
                </dt>
                <dd className="text-foreground" dir="ltr" data-ltr-content>
                  {signupAttribution?.[key]}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t('platform:organizations.signupSource.none')}
          </p>
        )}
      </div>
    </>
  );
}
