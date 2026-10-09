/**
 * Customer Requests — the contextual card and the create dialog.
 *
 * Pinned here:
 *  1. The card renders for an academy owner/administrator, is a real
 *     button with an accessible name, and opens the dialog preset to its
 *     type; it renders NOTHING for a manager (no door that answers 403).
 *  2. The dialog shows only the chosen type's own detail fields.
 *  3. Client-side bounds mirror the server (title, description, a detail's
 *     maxLength) and are shown next to the field; nothing is sent.
 *  4. One request per open: a double click sends once, and a retry after
 *     a failure reuses the SAME `clientRequestId`, so the server returns
 *     the request the first attempt may already have created.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { MockInstance } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createI18nInstance } from '@/localization/i18n';
import { LocalizationContext } from '@app/providers/localization/localization.context';
import type { LocalizationContextValue } from '@app/providers/localization/localization.context';
import { AcademyScopeContext } from '@features/academy';
import type { AcademyScopeValue } from '@features/academy';
import { ApiError } from '@api';
import type { AcademyStaffRole } from '@types';
import { RequestServiceCard } from './components/RequestServiceCard';
import { customerRequestService } from './services/CustomerRequestService';
import type {
  CreateCustomerRequestPayload,
  CustomerRequestDetail,
} from './types/customer-request.types';

const notify = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

vi.mock('@app/providers', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useToast: () => ({ notify, notifySuccess, notifyError, dismissAll: vi.fn() }),
  useConfirmDialog: () => ({ confirm: vi.fn(async () => true) }),
}));

const ACADEMY_ID = 'academy-1';

function scope(role: AcademyStaffRole): AcademyScopeValue {
  return {
    academyId: ACADEMY_ID,
    membership: {
      academy: {
        id: ACADEMY_ID,
        organizationId: 'org-1',
        name: 'Nile Academy',
        slug: 'nile',
        status: 'active',
        language: 'en',
      },
      role,
      roleSource: 'academy_membership',
      permissions: [],
    },
    isResolving: false,
    error: null,
    lostAcademyIds: new Set(),
    isCurrentAcademy: () => true,
  };
}

const LOCALIZATION: LocalizationContextValue = {
  language: 'en',
  languageDefinition: {} as LocalizationContextValue['languageDefinition'],
  direction: 'ltr',
  isRtl: false,
  locale: 'en-US',
  availableLanguages: [],
  setLanguage: () => undefined,
};

function renderCard(
  role: AcademyStaffRole,
  type: Parameters<typeof RequestServiceCard>[0]['type'] = 'logo'
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={createI18nInstance('en')}>
        <LocalizationContext.Provider value={LOCALIZATION}>
          <AcademyScopeContext.Provider value={scope(role)}>
            <MemoryRouter>
              <RequestServiceCard type={type} />
            </MemoryRouter>
          </AcademyScopeContext.Provider>
        </LocalizationContext.Provider>
      </I18nextProvider>
    </QueryClientProvider>
  );
}

function createdRequest(
  payload: CreateCustomerRequestPayload
): CustomerRequestDetail {
  return {
    id: 'req-1',
    reference: 'CR-REQ1REQ1',
    type: payload.type,
    title: payload.title,
    status: 'submitted',
    priority: payload.priority ?? 'normal',
    academy: { id: ACADEMY_ID, name: 'Nile Academy' },
    requester: { name: 'Sara' },
    createdAt: '2026-10-01T10:00:00.000Z',
    lastActivityAt: '2026-10-01T10:00:00.000Z',
    description: payload.description,
    details: payload.details ?? {},
    closedAt: null,
    events: [],
    canCancel: true,
    canReply: true,
  };
}

const USER_EVENT_OPTIONS = { delay: null, pointerEventsCheck: 0 } as const;

beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<
    string,
    unknown
  >;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
  window.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

let create: MockInstance<typeof customerRequestService.create>;

beforeEach(() => {
  create = vi.spyOn(customerRequestService, 'create');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  notify.mockReset();
  notifySuccess.mockReset();
  notifyError.mockReset();
});

async function openDialog(type: 'logo' | 'domain' = 'logo') {
  const user = userEvent.setup(USER_EVENT_OPTIONS);
  renderCard('owner', type);
  await user.click(
    screen.getByRole('button', {
      name: type === 'logo' ? 'Request a logo' : 'Request a domain',
    })
  );
  const dialog = await screen.findByRole('dialog');
  return { user, dialog };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(
    screen.getByTestId('customer-request-title'),
    'A new logo for spring'
  );
  await user.type(
    screen.getByTestId('customer-request-description'),
    'We need a modern logo for the spring launch.'
  );
}

describe('RequestServiceCard', () => {
  it('renders for an owner as a quiet card with a real, named button', () => {
    renderCard('owner');
    const card = screen.getByTestId('request-service-card-logo');
    expect(card.textContent).toContain('Need a professional logo?');
    const button = screen.getByRole('button', { name: 'Request a logo' });
    expect(button.tagName).toBe('BUTTON');
    expect(button.getAttribute('type')).toBe('button');
  });

  it('renders for an administrator too', () => {
    renderCard('administrator', 'domain');
    expect(
      screen.getByRole('button', { name: 'Request a domain' })
    ).toBeTruthy();
  });

  it.each(['manager', 'instructor', 'staff'] as const)(
    'renders nothing for a %s',
    (role) => {
      const { container } = renderCard(role);
      expect(container.textContent).toBe('');
      expect(screen.queryByRole('button')).toBeNull();
    }
  );

  it('opens the dialog preset to its type', async () => {
    const { dialog } = await openDialog('logo');
    expect(dialog.textContent).toContain('Request a logo');
    // Preset: no type picker.
    expect(screen.queryByRole('radio', { name: /Custom domain/ })).toBeNull();
  });
});

describe('CreateCustomerRequestDialog', () => {
  it("shows only the type's own detail fields", async () => {
    await openDialog('logo');
    for (const key of ['brandName', 'style', 'colors', 'references']) {
      expect(screen.getByTestId(`customer-request-detail-${key}`)).toBeTruthy();
    }
    for (const key of ['desiredDomain', 'registrar', 'requirements', 'page']) {
      expect(screen.queryByTestId(`customer-request-detail-${key}`)).toBeNull();
    }
  });

  it('shows the domain fields (and the owned yes/no) for a domain request', async () => {
    await openDialog('domain');
    expect(
      screen.getByTestId('customer-request-detail-desiredDomain')
    ).toBeTruthy();
    expect(
      screen.getByTestId('customer-request-detail-registrar')
    ).toBeTruthy();
    expect(screen.getByRole('radio', { name: 'Yes, I own it' })).toBeTruthy();
    expect(
      screen.queryByTestId('customer-request-detail-brandName')
    ).toBeNull();
  });

  it('validates the server bounds next to the fields and sends nothing', async () => {
    const { user } = await openDialog('logo');
    await user.type(screen.getByTestId('customer-request-title'), 'ab');
    await user.type(
      screen.getByTestId('customer-request-description'),
      'short'
    );
    await user.type(
      screen.getByTestId('customer-request-detail-brandName'),
      'x'.repeat(121)
    );
    await user.click(screen.getByTestId('customer-request-submit'));

    expect(
      await screen.findByText('Enter a title between 3 and 160 characters.')
    ).toBeTruthy();
    expect(
      screen.getByText('Write a description between 10 and 5000 characters.')
    ).toBeTruthy();
    expect(screen.getByText('Keep this under 120 characters.')).toBeTruthy();
    expect(
      screen.getByTestId('customer-request-title').getAttribute('aria-invalid')
    ).toBe('true');
    expect(create).not.toHaveBeenCalled();
  });

  it('submits once, and a retry reuses the same clientRequestId', async () => {
    let rejectFirst: (error: unknown) => void = () => undefined;
    create
      .mockImplementationOnce(
        () =>
          new Promise<CustomerRequestDetail>((_, reject) => {
            rejectFirst = reject;
          })
      )
      .mockImplementation(async (_academyId, payload) =>
        createdRequest(payload)
      );

    const { user } = await openDialog('logo');
    await fillValid(user);
    await user.type(
      screen.getByTestId('customer-request-detail-brandName'),
      'Nile'
    );

    const submit = screen.getByTestId('customer-request-submit');
    await user.click(submit);
    await user.click(submit);
    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));

    rejectFirst(
      new ApiError({
        kind: 'network',
        messageKey: 'errors.network',
        retryable: true,
      })
    );
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'error',
          titleKey: 'customerRequests:create.failed',
        })
      )
    );

    // Retry: the dialog is still open with the same answers.
    await user.click(screen.getByTestId('customer-request-submit'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));

    const [firstAcademy, first] = create.mock.calls[0];
    const [, second] = create.mock.calls[1];
    expect(firstAcademy).toBe(ACADEMY_ID);
    expect(first.clientRequestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    );
    expect(second.clientRequestId).toBe(first.clientRequestId);
    expect(second).toMatchObject({
      type: 'logo',
      title: 'A new logo for spring',
      priority: 'normal',
      details: { brandName: 'Nile' },
    });

    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith(
        expect.objectContaining({
          intent: 'success',
          titleKey: 'customerRequests:create.successTitle',
          action: expect.objectContaining({
            labelKey: 'customerRequests:create.viewRequest',
          }),
        })
      )
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('maps a known API refusal to its errors copy', async () => {
    create.mockRejectedValue(
      new ApiError({
        kind: 'validation',
        messageKey: 'errors.customerRequest.invalidDetails',
        status: 400,
        retryable: false,
      })
    );
    const { user } = await openDialog('logo');
    await fillValid(user);
    await user.click(screen.getByTestId('customer-request-submit'));
    await waitFor(() =>
      expect(notify).toHaveBeenCalledWith({
        intent: 'error',
        titleKey: 'customerRequests:create.failed',
        descriptionKey: 'errors:customerRequest.invalidDetails',
      })
    );
  });

  it('starts a fresh clientRequestId when the dialog is opened again', async () => {
    create.mockImplementation(async (_academyId, payload) =>
      createdRequest(payload)
    );
    const { user } = await openDialog('logo');
    await fillValid(user);
    await user.click(screen.getByTestId('customer-request-submit'));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await user.click(screen.getByRole('button', { name: 'Request a logo' }));
    await screen.findByRole('dialog');
    await fillValid(user);
    await user.click(screen.getByTestId('customer-request-submit'));
    await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
    expect(create.mock.calls[1][1].clientRequestId).not.toBe(
      create.mock.calls[0][1].clientRequestId
    );
  });
});
