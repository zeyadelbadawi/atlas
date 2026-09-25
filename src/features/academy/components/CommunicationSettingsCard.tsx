/**
 * Communication settings card (P66).
 *
 * Three things an academy owner decides about email:
 *
 *  - when learners are asked for an emailed sign-in code (`inherit` the
 *    platform default, on a `new_device` only, `always`, or `off`);
 *  - whether announcements may be emailed at all;
 *  - what digest frequency a new learner starts with.
 *
 * Owner-only, like `RegistrationPolicyCard`: `canEdit` disables the
 * controls up front so a Manager never sees a save that can only 403,
 * and the 403 is still mapped because the session role is a hint and
 * the server is the authority.
 *
 * Each control saves on change (optimistic, see the hook) — there is no
 * form and no Save button, because each of these is an independent
 * switch rather than a set of fields that only make sense together.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, MailWarning, Mails } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ErrorState } from '@components/feedback';
import { useToast } from '@app/providers';
import {
  useAcademyCommunicationSettings,
  useUpdateAcademyCommunicationSettings,
} from '../hooks';
import { getRosterErrorKey } from '../utils/academy-roster.utils';
import type {
  AcademyEmailOtpPolicy,
  LearnerDigestFrequency,
  UpdateAcademyCommunicationSettingsPayload,
} from '@types';

export interface CommunicationSettingsCardProps {
  readonly academyId: string;
  /** Whether the viewer may change the settings (Client Owner). */
  readonly canEdit: boolean;
}

const OTP_POLICIES: readonly AcademyEmailOtpPolicy[] = [
  'inherit',
  'new_device',
  'always',
  'off',
];

const DIGEST_OPTIONS: readonly LearnerDigestFrequency[] = [
  'immediate',
  'daily',
  'off',
];

export function CommunicationSettingsCard({
  academyId,
  canEdit,
}: CommunicationSettingsCardProps): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess, notifyError } = useToast();
  const { data, isLoading, error, refetch } =
    useAcademyCommunicationSettings(academyId);
  const update = useUpdateAcademyCommunicationSettings(academyId);

  const save = (payload: UpdateAcademyCommunicationSettingsPayload): void => {
    update.mutate(payload, {
      onSuccess: () => notifySuccess('academy:communication.saved'),
      onError: (err) =>
        notifyError(getRosterErrorKey(err, 'academy:communication.saveFailed')),
    });
  };

  // `editable: false` — deployment configuration, not stored data, until a
  // per-academy override exists server-side; shown, never offered to save.
  const readOnly = data?.editable === false;
  const disabled = !canEdit || update.isPending || readOnly;
  const inlineErrorKey = update.error
    ? getRosterErrorKey(update.error, 'academy:communication.saveFailed')
    : null;

  const renderBody = (): JSX.Element => {
    if (isLoading) {
      return (
        <div className="space-y-3" aria-busy>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
        </div>
      );
    }

    if (error || !data) {
      return <ErrorState kind={error?.kind} onRetry={() => refetch()} />;
    }

    return (
      <div className="space-y-6" aria-busy={update.isPending}>
        <fieldset className="space-y-3" disabled={disabled}>
          <legend className="text-sm font-medium">
            {t('academy:communication.otpPolicy.label')}
          </legend>
          <p className="text-xs text-muted-foreground">
            {t('academy:communication.otpPolicy.description')}
          </p>
          <RadioGroup
            value={data.emailOtpPolicy}
            onValueChange={(value) =>
              save({ emailOtpPolicy: value as AcademyEmailOtpPolicy })
            }
            disabled={disabled}
            aria-label={t('academy:communication.otpPolicy.label')}
            className="gap-3"
          >
            {OTP_POLICIES.map((policy) => (
              <div
                key={policy}
                className="flex items-start gap-3 rounded-lg border border-border p-3"
              >
                <RadioGroupItem
                  value={policy}
                  id={`email-otp-policy-${policy}`}
                  className="mt-0.5"
                />
                <Label
                  htmlFor={`email-otp-policy-${policy}`}
                  className="flex-1 cursor-pointer space-y-1 font-normal"
                >
                  <span className="block text-sm font-medium text-foreground">
                    {t(
                      `academy:communication.otpPolicy.options.${policy}.label`
                    )}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t(
                      `academy:communication.otpPolicy.options.${policy}.description`
                    )}
                  </span>
                </Label>
              </div>
            ))}
          </RadioGroup>

          {data.emailOtpPolicy === 'off' ? (
            <Alert role="status">
              <AlertTriangle className="size-4" aria-hidden />
              <AlertTitle>
                {t('academy:communication.otpPolicy.offWarningTitle')}
              </AlertTitle>
              <AlertDescription>
                {t('academy:communication.otpPolicy.offWarning')}
              </AlertDescription>
            </Alert>
          ) : null}
        </fieldset>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="announcement-email-allowed">
              {t('academy:communication.announcementEmail.label')}
            </Label>
            <p className="text-xs text-muted-foreground">
              {t('academy:communication.announcementEmail.description')}
            </p>
          </div>
          <Switch
            id="announcement-email-allowed"
            checked={data.announcementEmailAllowed}
            onCheckedChange={(checked) =>
              save({ announcementEmailAllowed: checked })
            }
            disabled={disabled}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="learner-digest-default">
            {t('academy:communication.digestDefault.label')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('academy:communication.digestDefault.description')}
          </p>
          <Select
            value={data.learnerDigestDefault}
            onValueChange={(value) =>
              save({ learnerDigestDefault: value as LearnerDigestFrequency })
            }
            disabled={disabled}
          >
            <SelectTrigger
              id="learner-digest-default"
              className="sm:max-w-xs"
              aria-label={t('academy:communication.digestDefault.label')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIGEST_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {t(`academy:communication.digestDefault.options.${option}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {readOnly ? (
          <p className="text-xs text-muted-foreground" role="status">
            {t('academy:communication.readOnlyNotice', {
              policy: t(
                `academy:communication.otpPolicy.options.${data.effectiveEmailOtpPolicy ?? 'new_device'}.label`,
                { defaultValue: data.effectiveEmailOtpPolicy ?? '' }
              ),
            })}
          </p>
        ) : !canEdit ? (
          <p className="text-xs text-muted-foreground">
            {t('academy:communication.ownerOnly')}
          </p>
        ) : null}

        {inlineErrorKey ? (
          <Alert variant="destructive" role="alert">
            <MailWarning className="size-4" aria-hidden />
            <AlertDescription>{t(inlineErrorKey)}</AlertDescription>
          </Alert>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mails
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:communication.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:communication.description')}
        </CardDescription>
      </CardHeader>
      <CardContent>{renderBody()}</CardContent>
    </Card>
  );
}
