/**
 * What was asked: the original description and the type's contextual
 * answers as a definition list, labelled with the same copy the create
 * dialog used. Unknown keys (a field retired after the request was filed)
 * are skipped rather than shown under a raw key.
 */
import { useTranslation } from 'react-i18next';
import {
  CR_NS,
  CUSTOMER_REQUEST_DETAIL_FIELDS,
} from '../constants/customer-request.constants';
import type {
  CustomerRequestDetails,
  CustomerRequestType,
} from '../types/customer-request.types';

export interface CustomerRequestBriefProps {
  readonly type: CustomerRequestType;
  readonly description: string;
  readonly details: CustomerRequestDetails;
}

export function CustomerRequestBrief({
  type,
  description,
  details,
}: CustomerRequestBriefProps): JSX.Element {
  const { t } = useTranslation();
  const answered = CUSTOMER_REQUEST_DETAIL_FIELDS[type].filter((field) => {
    const value = details[field.key];
    return value !== undefined && value !== '';
  });

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t(`${CR_NS}:detail.description`)}
        </h2>
        <p
          className="whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]"
          dir="auto"
        >
          {description}
        </p>
      </div>

      <div className="space-y-1.5">
        <h2 className="text-sm font-medium text-muted-foreground">
          {t(`${CR_NS}:details.heading`)}
        </h2>
        {answered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t(`${CR_NS}:detail.noDetails`)}
          </p>
        ) : (
          <dl
            className="grid gap-x-6 gap-y-3 sm:grid-cols-2"
            data-testid="customer-request-brief-details"
          >
            {answered.map((field) => {
              const value = details[field.key];
              const base = `${CR_NS}:details.${type}.${field.key}`;
              return (
                <div key={field.key} className="min-w-0 space-y-0.5">
                  <dt className="text-xs font-medium text-muted-foreground">
                    {t(`${base}.label`)}
                  </dt>
                  <dd
                    className="whitespace-pre-wrap break-words text-sm text-foreground [overflow-wrap:anywhere]"
                    dir="auto"
                  >
                    {typeof value === 'boolean'
                      ? t(`${base}.${value ? 'valueYes' : 'valueNo'}`)
                      : value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
      </div>
    </div>
  );
}
