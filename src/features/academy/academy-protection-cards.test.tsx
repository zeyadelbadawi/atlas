/**
 * Academy content protection, video tier and device policy (P64 Phase 2).
 *
 * All three are Client Owner only, READS included, so a Manager's cards
 * never ask the server and say why; the owner changes each setting and
 * the exact payload the backend DTO expects is sent. Changes that alter
 * what learners experience — the watermark on/off, a new upload tier, a
 * lower device limit — are confirmed before they are saved, and the
 * backend's own refusals (not in plan, above platform maximum, not the
 * owner) are shown in words rather than as a generic failure.
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
import { createI18nInstance } from '@/localization/i18n';
import { createApiError, type ApiError } from '@api';
import type {
  AcademyContentProtection,
  AcademyDevicePolicy,
  AcademyVideoTierSettings,
} from '@types';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

interface QueryState<T> {
  data: T | undefined;
  isLoading: boolean;
  error: ApiError | null;
}

const DEFAULT_CONTENT: AcademyContentProtection = {
  watermark: true,
  watermarkText: null,
  disableDownload: true,
  disablePip: false,
  disableContextMenu: true,
};
const DEFAULT_TIER: AcademyVideoTierSettings = {
  academyId: 'academy-1',
  videoSecurityTier: 'normal',
  entitled: 'normal',
  source: 'plan',
};
const DEFAULT_DEVICES: AcademyDevicePolicy = {
  academyId: 'academy-1',
  maxDevices: 3,
  maxConcurrentSessions: 1,
  source: 'academy',
  platformMaxDevices: 5,
  platformMaxConcurrentSessions: 2,
};

let content: QueryState<AcademyContentProtection>;
let tier: QueryState<AcademyVideoTierSettings>;
let devices: QueryState<AcademyDevicePolicy>;
let failure: ApiError | null = null;

function reset(): void {
  content = { data: DEFAULT_CONTENT, isLoading: false, error: null };
  tier = { data: DEFAULT_TIER, isLoading: false, error: null };
  devices = { data: DEFAULT_DEVICES, isLoading: false, error: null };
  failure = null;
}
reset();

const refetch = vi.fn();
const notifySuccess = vi.fn();
const notifyError = vi.fn();

function makeMutate() {
  return vi.fn(
    (
      _payload: unknown,
      handlers?: {
        readonly onSuccess?: (data: unknown) => void;
        readonly onError?: (error: unknown) => void;
      }
    ) => {
      if (failure) handlers?.onError?.(failure);
      else handlers?.onSuccess?.({});
    }
  );
}
const mutateContent = makeMutate();
const mutateTier = makeMutate();
const mutateDevices = makeMutate();

const useContentQuery = vi.fn(() => ({ ...content, refetch }));
const useTierQuery = vi.fn(() => ({ ...tier, refetch }));
const useDevicesQuery = vi.fn(() => ({ ...devices, refetch }));

vi.mock('./hooks', () => ({
  useAcademyContentProtection: () => useContentQuery(),
  useAcademyVideoTier: () => useTierQuery(),
  useAcademyDevicePolicy: () => useDevicesQuery(),
  useUpdateAcademyContentProtection: () => ({
    mutate: mutateContent,
    isPending: false,
    error: failure,
  }),
  useUpdateAcademyVideoTier: () => ({
    mutate: mutateTier,
    isPending: false,
    error: failure,
  }),
  useUpdateAcademyDevicePolicy: () => ({
    mutate: mutateDevices,
    isPending: false,
    error: failure,
  }),
}));

vi.mock('@app/providers', () => ({
  useToast: () => ({ notifySuccess, notifyError }),
}));

const { ContentProtectionCard } =
  await import('./components/ContentProtectionCard');
const { VideoTierCard } = await import('./components/VideoTierCard');
const { DevicePolicyCard } = await import('./components/DevicePolicyCard');

const i18n = createI18nInstance('en');

afterEach(() => {
  cleanup();
  reset();
  vi.clearAllMocks();
});

function renderAll(canEdit: boolean) {
  return render(
    <I18nextProvider i18n={i18n}>
      <ContentProtectionCard academyId="academy-1" canEdit={canEdit} />
      <VideoTierCard academyId="academy-1" canEdit={canEdit} />
      <DevicePolicyCard academyId="academy-1" canEdit={canEdit} />
    </I18nextProvider>
  );
}

function renderOne(node: JSX.Element) {
  return render(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

const OWNER_ONLY = /only the academy owner can view or change/i;

describe('protection cards — access', () => {
  it('never asks the server for a non-owner and says why on every card', () => {
    renderAll(false);

    expect(screen.getAllByText(OWNER_ONLY)).toHaveLength(3);
    // The content card has nothing to fetch at all any more.
    expect(useContentQuery).not.toHaveBeenCalled();
    expect(useTierQuery).not.toHaveBeenCalled();
    expect(useDevicesQuery).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
  });

  it('turns a server insufficient-role refusal on load into the same explanation, not a retry', () => {
    const refused = createApiError('forbidden', {
      messageKey: 'errors.academy.insufficientRole',
    });
    content = { data: undefined, isLoading: false, error: refused };
    tier = { data: undefined, isLoading: false, error: refused };
    devices = { data: undefined, isLoading: false, error: refused };
    renderAll(true);

    // The two cards that read settings explain the refusal; the content
    // card reads nothing (the watermark is mandatory) and is unaffected.
    expect(screen.getAllByText(OWNER_ONLY)).toHaveLength(2);
    expect(screen.getByText(/forensic watermark on every video/i)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });

  it('shows skeletons while loading and a retry on a real failure', () => {
    devices = { data: undefined, isLoading: true, error: null };
    tier = {
      data: undefined,
      isLoading: false,
      error: createApiError('server'),
    };
    const { container } = renderAll(true);

    expect(container.querySelector('[aria-busy="true"]')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});

describe('ContentProtectionCard', () => {
  it('states the forensic watermark is always on, with no switch, text field or save to change it', () => {
    renderOne(<ContentProtectionCard academyId="academy-1" canEdit />);

    expect(
      screen.getByRole('heading', {
        name: /forensic watermark on every video/i,
      })
    ).toBeTruthy();
    expect(screen.getByText(/can't be turned off/i)).toBeTruthy();
    // How a leak is traced, honestly: by Atlas, on request.
    expect(screen.getByText(/contact atlas support/i)).toBeTruthy();
    // Nothing configurable is offered — a control would change nothing.
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    // Nor is anything read or written for it.
    expect(useContentQuery).not.toHaveBeenCalled();
    expect(mutateContent).not.toHaveBeenCalled();
  });

  it('lists every player protection as always on, and never claims recording is prevented', () => {
    renderOne(<ContentProtectionCard academyId="academy-1" canEdit />);

    for (const label of [
      /fullscreen keeps the watermark/i,
      /tamper detection/i,
      /download button hidden/i,
      /picture-in-picture blocked/i,
      /right-click menu suppressed/i,
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    // The badge plus one per protection.
    expect(screen.getAllByText(/always on/i)).toHaveLength(6);
    expect(screen.getByText(/they do not stop screen recording/i)).toBeTruthy();
  });
});

describe('VideoTierCard', () => {
  it('does not offer Premium when the plan does not include it', () => {
    renderOne(<VideoTierCard academyId="academy-1" canEdit />);

    const premium = screen.getByRole('radio', { name: /premium/i });
    expect(premium.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/not included in your current plan/i)).toBeTruthy();
    expect(screen.getByText(/only new uploads use the tier/i)).toBeTruthy();
  });

  it('confirms a tier change and sends exactly the chosen tier', async () => {
    tier = {
      ...tier,
      data: { ...DEFAULT_TIER, entitled: 'premium', source: 'academy' },
    };
    renderOne(<VideoTierCard academyId="academy-1" canEdit />);

    fireEvent.click(screen.getByRole('radio', { name: /premium/i }));
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/already uploaded are not changed/i);
    fireEvent.click(screen.getByRole('button', { name: /switch tier/i }));

    expect(mutateTier).toHaveBeenCalledWith(
      { videoSecurityTier: 'premium' },
      expect.anything()
    );
    expect(notifySuccess).toHaveBeenCalledWith(
      'academy:protection.videoTier.saved'
    );
  });

  it('explains the not-entitled refusal in words', () => {
    failure = createApiError('forbidden', {
      messageKey: 'errors.entitlement.videoTierNotEntitled',
    });
    renderOne(<VideoTierCard academyId="academy-1" canEdit />);

    expect(screen.getByRole('alert').textContent).toMatch(
      /plan doesn't include premium video/i
    );
  });
});

describe('DevicePolicyCard', () => {
  it('confirms before lowering the device limit', async () => {
    renderOne(<DevicePolicyCard academyId="academy-1" canEdit />);

    fireEvent.change(
      screen.getByRole('spinbutton', { name: /devices per learner/i }),
      { target: { value: '2' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    const dialog = await screen.findByRole('alertdialog');
    expect(dialog.textContent).toMatch(/already registered/i);
    expect(mutateDevices).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /lower limit/i }));
    expect(mutateDevices).toHaveBeenCalledWith(
      { maxDevices: 2, maxConcurrentSessions: 1 },
      expect.anything()
    );
  });

  it('saves a raised limit directly', async () => {
    renderOne(<DevicePolicyCard academyId="academy-1" canEdit />);

    fireEvent.change(
      screen.getByRole('spinbutton', { name: /devices per learner/i }),
      { target: { value: '5' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() =>
      expect(mutateDevices).toHaveBeenCalledWith(
        { maxDevices: 5, maxConcurrentSessions: 1 },
        expect.anything()
      )
    );
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('refuses a value above the platform maximum before asking the server', async () => {
    renderOne(<DevicePolicyCard academyId="academy-1" canEdit />);

    expect(screen.getByText(/platform allows up to 5/i)).toBeTruthy();
    fireEvent.change(
      screen.getByRole('spinbutton', { name: /devices per learner/i }),
      { target: { value: '6' } }
    );
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    expect(
      await screen.findByText(/whole number between 1 and the maximum/i)
    ).toBeTruthy();
    expect(mutateDevices).not.toHaveBeenCalled();
  });

  it('explains the above-maximum refusal in words', () => {
    failure = createApiError('validation', {
      messageKey: 'errors.academy.devicePolicyAboveMaximum',
    });
    renderOne(<DevicePolicyCard academyId="academy-1" canEdit />);

    expect(screen.getByRole('alert').textContent).toMatch(
      /higher than the platform allows/i
    );
  });
});
