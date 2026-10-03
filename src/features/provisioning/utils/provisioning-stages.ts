/**
 * W2 — the honest progress model: four stages a person understands, each
 * derived ONLY from the server's real step states (no timers, no
 * percentages, nothing advancing on its own):
 *
 *   academy — `tenant` + `academy` (the Atlas address is reserved inside the
 *             academy step itself);
 *   website — `theme` (applies the theme and builds the pages);
 *   brand   — `branding` (the palette chosen in the form; the logo once it
 *             is attached), or "theme default colours" when nothing was
 *             chosen;
 *   ready   — `subdomain` (a re-check), `domain` (always the separate
 *             custom-domain flow, never shown) and `finalization`; done
 *             exactly when the request is `ready`.
 *
 * A stage is `current` only when the server's `currentStepKey` is inside it
 * and a worker has picked the request up; a branding failure is reported on
 * its stage but never blocks `ready` (the backend's product default).
 */
import type {
  ProvisioningError,
  ProvisioningRequest,
  ProvisioningStep,
  ProvisioningStepKey,
} from '@types';
import { TERMINAL_PROVISIONING_STATUSES } from '@types';
import type { PROVISIONING_STAGE_KEYS } from '../constants/provisioning.constants';
import type { LogoUploadState } from '../hooks/usePendingLogoUpload';

export type ProvisioningStageKey = (typeof PROVISIONING_STAGE_KEYS)[number];

export type ProvisioningStageState =
  'pending' | 'current' | 'done' | 'failed' | 'skipped' | 'attention';

export interface ProvisioningStageView {
  readonly key: ProvisioningStageKey;
  readonly state: ProvisioningStageState;
  /** i18n key (provisioning namespace) for the row's label. */
  readonly labelKey: string;
  /** i18n key for a secondary line under the label, when there is one. */
  readonly noteKey?: string;
  readonly error?: ProvisioningError;
}

const STAGE_STEPS: Readonly<
  Record<ProvisioningStageKey, readonly ProvisioningStepKey[]>
> = {
  academy: ['tenant', 'academy'],
  website: ['theme'],
  brand: ['branding'],
  ready: ['subdomain', 'domain', 'finalization'],
};

function stageOfStep(step: ProvisioningStepKey): ProvisioningStageKey {
  return (Object.keys(STAGE_STEPS) as ProvisioningStageKey[]).find((stage) =>
    STAGE_STEPS[stage].includes(step)
  )!;
}

export function isProvisioningTerminal(request: ProvisioningRequest): boolean {
  return TERMINAL_PROVISIONING_STATUSES.includes(request.status);
}

function baseState(
  request: ProvisioningRequest,
  stage: ProvisioningStageKey,
  steps: readonly (ProvisioningStep | undefined)[]
): { state: ProvisioningStageState; error?: ProvisioningError } {
  const failed = steps.find((step) => step?.status === 'failed');
  if (failed) return { state: 'failed', error: failed.error };
  const finished = steps.every(
    (step) => step?.status === 'completed' || step?.status === 'skipped'
  );
  if (finished) return { state: 'done' };
  const running = steps.some((step) => step?.status === 'running');
  const isCurrentStage =
    !isProvisioningTerminal(request) &&
    !!request.startedAt &&
    stageOfStep(request.currentStepKey) === stage;
  return { state: running || isCurrentStage ? 'current' : 'pending' };
}

export function deriveProvisioningStages(
  request: ProvisioningRequest,
  logo: LogoUploadState = 'none'
): readonly ProvisioningStageView[] {
  const byKey = new Map(request.steps.map((step) => [step.key, step] as const));
  const stepsOf = (stage: ProvisioningStageKey) =>
    STAGE_STEPS[stage].map((key) => byKey.get(key));

  const academy = baseState(request, 'academy', stepsOf('academy'));
  const website = baseState(request, 'website', stepsOf('website'));
  const ready =
    request.status === 'ready'
      ? { state: 'done' as const }
      : baseState(request, 'ready', stepsOf('ready'));

  // Brand: what was chosen decides the label; the server step (and, for
  // the logo, the attach) decides the state.
  const brandStep = byKey.get('branding');
  const requested = request.requestedBrand;
  let brand: Omit<ProvisioningStageView, 'key'>;
  if (!requested) {
    brand = {
      state:
        brandStep?.status === 'completed' || brandStep?.status === 'skipped'
          ? 'skipped'
          : baseState(request, 'brand', [brandStep]).state === 'current'
            ? 'current'
            : 'pending',
      labelKey: 'provisioning:stages.brand.themeDefault',
    };
  } else {
    const base = baseState(request, 'brand', [brandStep]);
    const labelKey = 'provisioning:stages.brand.label';
    if (base.state === 'failed') {
      brand = { state: 'failed', labelKey, error: base.error };
    } else if (base.state === 'done' && requested.logo === 'awaiting_upload') {
      brand =
        logo === 'missing'
          ? {
              state: 'attention',
              labelKey,
              noteKey: 'provisioning:stages.brand.logoMissing',
            }
          : logo === 'failed'
            ? {
                state: 'failed',
                labelKey,
                noteKey: 'provisioning:stages.brand.logoFailed',
              }
            : {
                state: 'current',
                labelKey,
                noteKey: 'provisioning:stages.brand.logoUploading',
              };
    } else {
      brand = { state: base.state, labelKey };
    }
  }

  return [
    {
      key: 'academy',
      labelKey: 'provisioning:stages.academy.label',
      ...academy,
    },
    {
      key: 'website',
      labelKey:
        request.websiteSetupMode === 'complete'
          ? 'provisioning:stages.website.labelComplete'
          : 'provisioning:stages.website.label',
      ...website,
    },
    { key: 'brand', ...brand },
    { key: 'ready', labelKey: 'provisioning:stages.ready.label', ...ready },
  ];
}

/** Whether the brand stage needs the "branding could not be applied — Retry" warning (the request itself is not blocked). */
export function isBrandingFailure(request: ProvisioningRequest): boolean {
  return (
    request.status !== 'failed' &&
    request.steps.some(
      (step) => step.key === 'branding' && step.status === 'failed'
    )
  );
}

/**
 * The one sentence the live region announces for the request's current
 * situation — it only changes when something meaningful changes, so a
 * screen-reader user hears each real transition once, not every poll.
 */
export function provisioningAnnouncementKey(
  request: ProvisioningRequest,
  stages: readonly ProvisioningStageView[]
): string {
  if (request.status === 'cancelled') return 'provisioning:announce.cancelled';
  if (request.status === 'failed') return 'provisioning:announce.failed';
  if (request.status === 'ready') {
    return isBrandingFailure(request)
      ? 'provisioning:announce.readyBrandFailed'
      : 'provisioning:announce.ready';
  }
  if (request.stalled) return 'provisioning:announce.stalled';
  if (!request.startedAt) return 'provisioning:announce.queued';
  const current = stages.find((stage) => stage.state === 'current');
  return `provisioning:announce.${current?.key ?? 'academy'}`;
}
