/**
 * The facts of one request at a glance — reference, type, status,
 * priority, created and last update — as a definition list, with room for
 * the extra facts the Platform Owner view adds (requester, organization,
 * where its emails go).
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@components/data-display';
import { useDateFormatter } from '@hooks';
import { CR_NS } from '../constants/customer-request.constants';
import {
  customerRequestPriorityLabelKey,
  customerRequestPriorityTone,
  customerRequestStatusLabelKey,
  customerRequestStatusTone,
  customerRequestTypeIcon,
  customerRequestTypeLabelKey,
} from '../utils/customer-request.utils';
import type { CustomerRequestDetail } from '../types/customer-request.types';

export interface CustomerRequestSummaryFact {
  readonly id: string;
  readonly label: string;
  readonly value: ReactNode;
}

export interface CustomerRequestSummaryProps {
  readonly request: CustomerRequestDetail;
  /** Extra facts appended after the standard ones. */
  readonly extraFacts?: readonly CustomerRequestSummaryFact[];
}

export function CustomerRequestSummary({
  request,
  extraFacts = [],
}: CustomerRequestSummaryProps): JSX.Element {
  const { t } = useTranslation();
  const fmt = useDateFormatter();
  const TypeIcon = customerRequestTypeIcon(request.type);

  const facts: readonly CustomerRequestSummaryFact[] = [
    {
      id: 'reference',
      label: t(`${CR_NS}:detail.reference`),
      value: (
        <span className="font-mono text-sm" dir="ltr">
          {request.reference}
        </span>
      ),
    },
    {
      id: 'type',
      label: t(`${CR_NS}:detail.type`),
      value: (
        <span className="inline-flex items-center gap-1.5">
          <TypeIcon className="size-4 text-primary" aria-hidden />
          {t(customerRequestTypeLabelKey(request.type))}
        </span>
      ),
    },
    {
      id: 'status',
      label: t(`${CR_NS}:detail.status`),
      value: (
        <StatusBadge
          labelKey={customerRequestStatusLabelKey(request.status)}
          tone={customerRequestStatusTone(request.status)}
        />
      ),
    },
    {
      id: 'priority',
      label: t(`${CR_NS}:detail.priority`),
      value: (
        <StatusBadge
          labelKey={customerRequestPriorityLabelKey(request.priority)}
          tone={customerRequestPriorityTone(request.priority)}
        />
      ),
    },
    {
      id: 'created',
      label: t(`${CR_NS}:detail.created`),
      value: (
        <time dateTime={request.createdAt}>
          {fmt.dateTime(request.createdAt)}
        </time>
      ),
    },
    {
      id: 'updated',
      label: t(`${CR_NS}:detail.updated`),
      value: (
        <time dateTime={request.lastActivityAt}>
          {fmt.dateTime(request.lastActivityAt)}
        </time>
      ),
    },
    ...extraFacts,
  ];

  return (
    <dl
      className="grid gap-x-4 gap-y-3 text-sm sm:grid-cols-2"
      data-testid="customer-request-summary"
    >
      {facts.map((fact) => (
        <div key={fact.id} className="min-w-0 space-y-1">
          <dt className="text-xs font-medium text-muted-foreground">
            {fact.label}
          </dt>
          <dd className="min-w-0 break-words text-foreground [overflow-wrap:anywhere]">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
