/**
 * Customer Requests — the shared vocabulary, mirrored from
 * `atlas-backend/src/customer-requests/customer-requests.constants.ts` and
 * the request DTOs. The client-side bounds below exist so a customer sees
 * the problem next to the field before submitting; the server re-checks
 * every one of them.
 */
import type {
  CustomerRequestPriority,
  CustomerRequestSortField,
  CustomerRequestStatus,
  CustomerRequestType,
} from '../types/customer-request.types';

export const CUSTOMER_REQUEST_TYPES: readonly CustomerRequestType[] = [
  'logo',
  'domain',
  'theme',
  'custom_section',
  'custom_feature',
];

export const CUSTOMER_REQUEST_STATUSES: readonly CustomerRequestStatus[] = [
  'submitted',
  'received',
  'under_review',
  'in_progress',
  'waiting_for_customer',
  'completed',
  'rejected',
  'cancelled',
];

/** Nothing moves out of these from the customer's side. */
export const CLOSED_CUSTOMER_REQUEST_STATUSES: ReadonlySet<CustomerRequestStatus> =
  new Set(['completed', 'rejected', 'cancelled']);

export const CUSTOMER_REQUEST_PRIORITIES: readonly CustomerRequestPriority[] = [
  'low',
  'normal',
  'high',
];

export const DEFAULT_CUSTOMER_REQUEST_PRIORITY: CustomerRequestPriority =
  'normal';

/** Academy roles that may file and follow requests (server-enforced too). */
export const CUSTOMER_REQUEST_ACADEMY_ROLES: readonly string[] = [
  'owner',
  'administrator',
];

export const CUSTOMER_REQUEST_TITLE_MIN = 3;
export const CUSTOMER_REQUEST_TITLE_MAX = 160;
export const CUSTOMER_REQUEST_DESCRIPTION_MIN = 10;
export const CUSTOMER_REQUEST_DESCRIPTION_MAX = 5000;
export const CUSTOMER_REQUEST_MESSAGE_MAX = 5000;
export const CUSTOMER_REQUEST_ROUTING_EMAIL_MAX = 320;

export interface CustomerRequestDetailField {
  readonly key: string;
  readonly kind: 'text' | 'boolean';
  readonly maxLength?: number;
  /** Long answers get a textarea. */
  readonly multiline?: boolean;
}

/** Only what each kind of request needs — unknown keys are refused server-side. */
export const CUSTOMER_REQUEST_DETAIL_FIELDS: Readonly<
  Record<CustomerRequestType, readonly CustomerRequestDetailField[]>
> = {
  logo: [
    { key: 'brandName', kind: 'text', maxLength: 120 },
    { key: 'style', kind: 'text', maxLength: 500, multiline: true },
    { key: 'colors', kind: 'text', maxLength: 300 },
    { key: 'references', kind: 'text', maxLength: 1000, multiline: true },
  ],
  domain: [
    { key: 'desiredDomain', kind: 'text', maxLength: 253 },
    { key: 'alreadyOwned', kind: 'boolean' },
    { key: 'registrar', kind: 'text', maxLength: 120 },
  ],
  theme: [
    { key: 'style', kind: 'text', maxLength: 500, multiline: true },
    { key: 'colors', kind: 'text', maxLength: 300 },
    { key: 'references', kind: 'text', maxLength: 1000, multiline: true },
    { key: 'requirements', kind: 'text', maxLength: 2000, multiline: true },
  ],
  custom_section: [
    { key: 'page', kind: 'text', maxLength: 200 },
    { key: 'references', kind: 'text', maxLength: 1000, multiline: true },
  ],
  custom_feature: [
    { key: 'problem', kind: 'text', maxLength: 2000, multiline: true },
    {
      key: 'expectedOutcome',
      kind: 'text',
      maxLength: 2000,
      multiline: true,
    },
  ],
};

export const CUSTOMER_REQUEST_SORT_OPTIONS = [
  'lastActivityAt:desc',
  'lastActivityAt:asc',
  'createdAt:desc',
  'createdAt:asc',
  'title:asc',
  'title:desc',
] as const;

export type CustomerRequestSortOption =
  (typeof CUSTOMER_REQUEST_SORT_OPTIONS)[number];

export const DEFAULT_CUSTOMER_REQUEST_SORT: CustomerRequestSortOption =
  'lastActivityAt:desc';

export function splitCustomerRequestSort(option: CustomerRequestSortOption): {
  readonly field: CustomerRequestSortField;
  readonly direction: 'asc' | 'desc';
} {
  const [field, direction] = option.split(':') as [
    CustomerRequestSortField,
    'asc' | 'desc',
  ];
  return { field, direction };
}

/** The `customerRequests` translation namespace prefix. */
export const CR_NS = 'customerRequests';
