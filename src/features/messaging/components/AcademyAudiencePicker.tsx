/**
 * W3-compose — who an academy message goes to: all active learners,
 * learners of chosen courses, or staff by role. The server resolves every
 * recipient from this choice inside the academy; the client never sends
 * user ids.
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Skeleton } from '@/components/ui/skeleton';
import { useCourses } from '@features/course';
import { ACADEMY_STAFF_ROLES } from '../messaging.types';
import {
  toggle,
  type AcademyAudienceDraft,
  type AcademyAudienceType,
} from '../utils/academy-audience';

export interface AcademyAudiencePickerProps {
  readonly academyId: string;
  readonly value: AcademyAudienceDraft;
  readonly onChange: (value: AcademyAudienceDraft) => void;
}

export function AcademyAudiencePicker({
  academyId,
  value,
  onChange,
}: AcademyAudiencePickerProps): JSX.Element {
  const { t } = useTranslation();
  const groupId = useId();
  const courses = useCourses(academyId, {
    query: { pagination: { page: 1, pageSize: 100 } },
    enabled: value.type === 'courses',
  });

  return (
    <div className="space-y-3">
      <RadioGroup
        value={value.type}
        onValueChange={(type) =>
          onChange({ ...value, type: type as AcademyAudienceType })
        }
        aria-label={t('messaging:composer.audience')}
        className="grid gap-2 sm:grid-cols-3"
      >
        {(['learners', 'courses', 'staff'] as const).map((type) => (
          <label
            key={type}
            htmlFor={`${groupId}-${type}`}
            className="flex min-h-11 cursor-pointer items-start gap-3 rounded-md border border-border p-3 text-sm has-[:checked]:border-primary"
          >
            <RadioGroupItem
              id={`${groupId}-${type}`}
              value={type}
              className="mt-0.5"
              data-testid={`audience-${type}`}
            />
            <span className="space-y-0.5">
              <span className="block font-medium">
                {t(`messaging:audience.academy.${type}`)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t(`messaging:audience.academy.${type}Help`)}
              </span>
            </span>
          </label>
        ))}
      </RadioGroup>

      {value.type === 'courses' ? (
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium">
            {t('messaging:audience.academy.chooseCourses')}
          </legend>
          {courses.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : (courses.data?.items ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t('messaging:audience.academy.noCourses')}
            </p>
          ) : (
            <div className="grid max-h-60 gap-1 overflow-y-auto sm:grid-cols-2">
              {(courses.data?.items ?? []).map((course) => (
                <label
                  key={course.id}
                  className="flex min-h-11 items-center gap-3 text-sm"
                >
                  <Checkbox
                    checked={value.courseIds.includes(course.id)}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...value,
                        courseIds: toggle(
                          value.courseIds,
                          course.id,
                          checked === true
                        ),
                      })
                    }
                  />
                  <span className="min-w-0 break-words" dir="auto">
                    {course.title}
                  </span>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      ) : null}

      {value.type === 'staff' ? (
        <fieldset className="space-y-2 rounded-md border border-border p-3">
          <legend className="px-1 text-xs font-medium">
            {t('messaging:audience.academy.chooseRoles')}
          </legend>
          <div className="grid gap-1 sm:grid-cols-3">
            {ACADEMY_STAFF_ROLES.map((role) => (
              <label
                key={role}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <Checkbox
                  checked={value.roles.includes(role)}
                  onCheckedChange={(checked) =>
                    onChange({
                      ...value,
                      roles: toggle(value.roles, role, checked === true),
                    })
                  }
                  data-testid={`audience-role-${role}`}
                />
                {t(`messaging:roles.${role}`)}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
    </div>
  );
}
