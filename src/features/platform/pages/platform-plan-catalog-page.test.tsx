/**
 * Plan management — the Platform Owner's plan list (atlas-backend#112).
 *
 * Pinned here: rows come from the OWNER list (`usePlatformPlanList`), not
 * the customer catalog — hidden and archived plans included — each with its
 * localized name, its key left-to-right, a visibility badge ("Listed #n",
 * "Hidden", "Archived"), its prices and who is on it; the chips and the
 * search reach the server query (Listed by default); an archived plan
 * offers Restore instead of Archive; the old "hidden plans aren't listed"
 * note is gone and the marketing-deploy note is shown; Arabic renders with
 * Western digits and no raw keys. The dialogs are stubbed (their own tests
 * cover them); what the page hands them is checked.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Plan, PlatformPlanQuery, PlatformPlanRow } from '@types';

const row = (over: Partial<PlatformPlanRow> = {}): PlatformPlanRow =>
  ({
    id: 'p-growth',
    key: 'growth',
    name: 'Growth',
    nameLocalized: { en: 'Growth', ar: 'النمو' },
    description: 'For growing academies',
    status: 'active',
    displayOrder: 2,
    version: 4,
    limits: {},
    features: {},
    pricing: {
      amount: 1500,
      currency: 'EGP',
      billingCycle: 'monthly',
      yearlyAmount: 15000,
    },
    trialEligible: true,
    giftedDaysMonthly: 7,
    giftedDaysYearly: null,
    subscribers: {
      paying: 1200,
      trialing: 3,
      scheduledIn: 1,
      foundingLocks: 2,
    },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
    ...over,
  }) as PlatformPlanRow;

const ROWS: readonly PlatformPlanRow[] = [
  row(),
  row({
    id: 'p-founding',
    key: 'founding-2026',
    name: 'Founding',
    nameLocalized: undefined,
    displayOrder: 0,
    subscribers: { paying: 5, trialing: 0, scheduledIn: 0, foundingLocks: 5 },
  }),
  row({
    id: 'p-legacy',
    key: 'legacy',
    name: 'Legacy',
    nameLocalized: undefined,
    status: 'archived',
    displayOrder: 0,
  }),
];

const listCalls = vi.hoisted(() => [] as PlatformPlanQuery[]);

vi.mock('../hooks/usePlatformPlans', () => ({
  usePlatformPlanList: (query: PlatformPlanQuery) => {
    listCalls.push(query);
    const items =
      query.visibility === 'listed' && query.pageSize === 100
        ? [
            row({ displayOrder: 2 }),
            row({ id: 'p-pro', key: 'pro', displayOrder: 5 }),
          ]
        : ROWS;
    return {
      data: {
        items,
        pagination: { page: 1, pageSize: 20, totalItems: 41, totalPages: 3 },
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
  },
}));

vi.mock('@features/tenant', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useAddOnCatalog: () => ({
    data: [
      {
        id: 'a1',
        key: 'extra-academy',
        name: 'Extra Academy',
        pricing: { amount: 300, currency: 'EGP' },
      },
    ],
    isLoading: false,
    error: null,
  }),
}));

const stubs = vi.hoisted(() => ({
  editing: null as Plan | null,
  editorNext: undefined as number | undefined,
  restoreNext: undefined as number | undefined,
}));

vi.mock('../components/PlanEditorDialog', () => ({
  PlanEditorDialog: (props: {
    plan: Plan | null;
    nextListedPosition?: number;
  }) => {
    stubs.editing = props.plan;
    stubs.editorNext = props.nextListedPosition;
    return props.plan ? (
      <div data-testid="editor-open">{props.plan.key}</div>
    ) : null;
  },
}));
vi.mock('../components/PlanHistoryPanel', () => ({
  PlanHistoryPanel: ({ planKey }: { planKey: string }) => (
    <div data-testid="history-open">{planKey}</div>
  ),
}));
vi.mock('../components/CreatePlanDialog', () => ({
  CreatePlanDialog: (props: {
    open: boolean;
    onCreated: (plan: Plan) => void;
  }) =>
    props.open ? (
      <button
        type="button"
        data-testid="create-open"
        onClick={() => props.onCreated(row({ id: 'p-new', key: 'new-plan' }))}
      >
        create
      </button>
    ) : null,
}));
vi.mock('../components/ArchivePlanDialog', () => ({
  ArchivePlanDialog: ({ plan }: { plan: PlatformPlanRow | null }) =>
    plan ? <div data-testid="archive-open">{plan.key}</div> : null,
}));
vi.mock('../components/RestorePlanDialog', () => ({
  RestorePlanDialog: (props: {
    plan: PlatformPlanRow | null;
    nextListedPosition: number;
  }) => {
    stubs.restoreNext = props.nextListedPosition;
    return props.plan ? (
      <div data-testid="restore-open">{props.plan.key}</div>
    ) : null;
  },
}));

const { default: PlatformPlanCatalogPage } =
  await import('./PlatformPlanCatalogPage');

function renderPage(language: 'en' | 'ar' = 'en') {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <PlatformPlanCatalogPage />
      </MemoryRouter>
    </I18nextProvider>
  );
}

/** The page's own list query (the listed lookup uses pageSize 100). */
const lastPageQuery = (): PlatformPlanQuery =>
  [...listCalls].reverse().find((query) => query.pageSize === 20)!;

afterEach(() => {
  cleanup();
  listCalls.length = 0;
  stubs.editing = null;
});

describe('PlatformPlanCatalogPage — plan management', () => {
  it('lists every plan from the owner list with its badge, key, prices and who is on it', () => {
    const { container } = renderPage();
    expect(screen.getByTestId('plan-badge-growth').textContent).toBe(
      'Listed #2'
    );
    expect(screen.getByTestId('plan-badge-founding-2026').textContent).toBe(
      'Hidden'
    );
    expect(screen.getByTestId('plan-badge-legacy').textContent).toBe(
      'Archived'
    );
    const key = screen.getByTestId('plan-key-founding-2026');
    expect(key.getAttribute('dir')).toBe('ltr');
    expect(screen.getByTestId('plan-subscribers-growth').textContent).toBe(
      'Paying 1,200 · Trialing 3 · Switching in 1 · Founding 2'
    );
    const price = screen.getByTestId('plan-price-growth').textContent ?? '';
    expect(price).toMatch(/1,500/);
    expect(price).toMatch(/month/);
    expect(price).toMatch(/15,000/);
    expect(price).toMatch(/year/);
    expect(screen.getByTestId('plan-gift-summary-growth').textContent).toBe(
      'Gifted setup days: 7 monthly · none yearly'
    );
    expect(container.textContent).not.toMatch(/platform:|planCatalog\./);
  });

  it('offers Restore for an archived plan and Archive for the others', () => {
    renderPage();
    expect(screen.getByTestId('plan-restore-legacy')).toBeTruthy();
    expect(screen.queryByTestId('plan-archive-legacy')).toBeNull();
    expect(screen.getByTestId('plan-archive-growth')).toBeTruthy();
    expect(screen.getByTestId('plan-archive-founding-2026')).toBeTruthy();
    expect(screen.queryByTestId('plan-restore-growth')).toBeNull();
  });

  it('asks the server for listed plans first, and the chips change the visibility', () => {
    renderPage();
    expect(lastPageQuery()).toEqual({
      page: 1,
      pageSize: 20,
      search: undefined,
      visibility: 'listed',
    });
    expect(
      screen.getByTestId('plan-filter-listed').getAttribute('aria-pressed')
    ).toBe('true');

    fireEvent.click(screen.getByTestId('plan-filter-archived'));
    expect(lastPageQuery().visibility).toBe('archived');
    fireEvent.click(screen.getByTestId('plan-filter-hidden'));
    expect(lastPageQuery().visibility).toBe('hidden');
    fireEvent.click(screen.getByTestId('plan-filter-all'));
    expect(lastPageQuery().visibility).toBeUndefined();
  });

  it('sends the search to the server and pages from the first page again', async () => {
    renderPage();
    fireEvent.click(screen.getByText('Next'));
    expect(lastPageQuery().page).toBe(2);
    fireEvent.change(screen.getByLabelText('Search plans by key or name'), {
      target: { value: '  gro ' },
    });
    await waitFor(() => expect(lastPageQuery().search).toBe('gro'));
    expect(lastPageQuery().page).toBe(1);
  });

  it('drops the old hidden-plans note and says the pricing page follows the next deploy', () => {
    renderPage();
    expect(screen.queryByTestId('plan-catalog-hidden-note')).toBeNull();
    expect(
      screen.getByTestId('plan-catalog-marketing-note').textContent
    ).toContain('after the next site deploy');
  });

  it('opens Archive and Restore on the row, offering the next free position', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('plan-restore-legacy'));
    expect(screen.getByTestId('restore-open').textContent).toBe('legacy');
    // Listed positions 2 and 5 → 6.
    expect(stubs.restoreNext).toBe(6);
    expect(stubs.editorNext).toBe(6);
    fireEvent.click(screen.getByTestId('plan-archive-growth'));
    expect(screen.getByTestId('archive-open').textContent).toBe('growth');
  });

  it('New plan opens the create dialog, and the created plan opens in the editor', () => {
    renderPage();
    expect(screen.queryByTestId('create-open')).toBeNull();
    fireEvent.click(screen.getByTestId('plan-create'));
    fireEvent.click(screen.getByTestId('create-open'));
    expect(screen.getByTestId('editor-open').textContent).toBe('new-plan');
  });

  it('keeps the add-ons card read-only, with prices and a link to the Add-ons page', () => {
    renderPage();
    expect(
      screen.getByTestId('catalog-addon-price-extra-academy').textContent
    ).toMatch(/300/);
    expect(
      screen.getByTestId('plan-catalog-addons-link').getAttribute('href')
    ).toBe('/dashboard/platform/add-ons');
  });

  it('renders in Arabic with Western digits and no raw keys', () => {
    const { container } = renderPage('ar');
    expect(container.textContent).not.toMatch(/platform:|planCatalog\./);
    expect(screen.getByText('النمو')).toBeTruthy();
    expect(screen.getByTestId('plan-badge-growth').textContent).toContain('2');
    expect(screen.getByTestId('plan-subscribers-growth').textContent).toContain(
      '1,200'
    );
    expect(container.textContent).not.toMatch(/[٠-٩]/);
  });
});
