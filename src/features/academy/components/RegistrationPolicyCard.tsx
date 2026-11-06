/**
 * Registration Policy card (P64 Phase 1).
 *
 * How new learners get onto the academy website: `open` (anyone),
 * `invite` (invite link only) or `approval` (sign-ups wait as pending).
 *
 * Only the Client Owner may change it. `canEdit` (from the session's
 * organization role) disables the control up front so a Manager never
 * sees a Save that can only 403 — but the 403 is still mapped, because
 * the session role is a hint and the server is the authority.
 */
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Save, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@components/feedback';
import { useToast } from '@app/providers';
import { useUnsavedChanges } from '@hooks';
import type { ApiError } from '@api';
import { InlineFailureAlert } from './InlineFailureAlert';
import {
  useAcademyRegistrationPolicy,
  useUpdateAcademyRegistrationPolicy,
} from '../hooks';
import { getRosterSpecificKey } from '../utils/academy-roster.utils';
import type { AcademyRegistrationPolicy } from '@types';

export interface RegistrationPolicyCardProps {
  readonly academyId: string;
  /** Whether the viewer may change the policy (Client Owner). */
  readonly canEdit: boolean;
}

const POLICIES: readonly AcademyRegistrationPolicy[] = [
  'open',
  'invite',
  'approval',
];

export function RegistrationPolicyCard({
  academyId,
  canEdit,
}: RegistrationPolicyCardProps): JSX.Element {
  const { t } = useTranslation();
  const { notifySuccess } = useToast();

  const { data, isLoading, error, refetch } =
    useAcademyRegistrationPolicy(academyId);
  const update = useUpdateAcademyRegistrationPolicy(academyId);

  const [selected, setSelected] = useState<AcademyRegistrationPolicy | null>(
    null
  );
  const [failure, setFailure] = useState<ApiError | null>(null);

  useEffect(() => {
    if (data) setSelected(data.registrationPolicy);
  }, [data]);

  const isDirty =
    !!data && selected !== null && selected !== data.registrationPolicy;

  const markSavedRef = useRef<() => void>(() => undefined);
  // B4 (UX audit) V07 — leaving with an unsaved choice asks first (and the
  // section switch on Settings asks too: it reads the same registry).
  const save = () =>
    new Promise<boolean>((resolve) => {
      if (!selected) return resolve(false);
      setFailure(null);
      update.mutate(
        { registrationPolicy: selected },
        {
          onSuccess: () => {
            markSavedRef.current();
            notifySuccess('academy:registration.policy.saved');
            resolve(true);
          },
          // ONE message (B4 V09): the inline alert with the real reason.
          onError: (err) => {
            setFailure(err);
            resolve(false);
          },
        }
      );
    });
  const { markSaved } = useUnsavedChanges({
    isDirty: canEdit && isDirty,
    onSave: save,
  });
  markSavedRef.current = markSaved;

  const handleSave = () => {
    void save();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
            aria-hidden
          />
          {t('academy:registration.policy.title')}
        </CardTitle>
        <CardDescription>
          {t('academy:registration.policy.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2" aria-busy>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : error || !data ? (
          <ErrorState kind={error?.kind} onRetry={() => refetch()} />
        ) : (
          <>
            <RadioGroup
              value={selected ?? data.registrationPolicy}
              onValueChange={(value) =>
                setSelected(value as AcademyRegistrationPolicy)
              }
              disabled={!canEdit || update.isPending}
              aria-label={t('academy:registration.policy.title')}
              className="gap-3"
            >
              {POLICIES.map((policy) => (
                <div
                  key={policy}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <RadioGroupItem
                    value={policy}
                    id={`registration-policy-${policy}`}
                    className="mt-0.5"
                  />
                  <Label
                    htmlFor={`registration-policy-${policy}`}
                    className="flex-1 cursor-pointer space-y-1 font-normal"
                  >
                    <span className="block text-sm font-medium text-foreground">
                      {t(`academy:registration.policy.options.${policy}.label`)}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {t(
                        `academy:registration.policy.options.${policy}.description`
                      )}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            {!canEdit ? (
              <p className="text-xs text-muted-foreground">
                {t('academy:registration.policy.ownerOnly')}
              </p>
            ) : null}

            {failure ? (
              <InlineFailureAlert
                error={failure}
                titleKey="academy:registration.policy.notChanged"
                specificKey={getRosterSpecificKey(failure)}
              />
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSave}
                disabled={!canEdit || !isDirty || update.isPending}
              >
                {update.isPending ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-4" strokeWidth={2} aria-hidden />
                )}
                {t('academy:registration.policy.save')}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
