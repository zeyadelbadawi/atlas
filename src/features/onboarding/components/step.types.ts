/**
 * What every setup screen receives from the shell.
 *
 * Steps never decide completion themselves: after doing their work they
 * call `refresh` (a re-read of the server status) and move on with
 * `onNext` / `goTo`. That is the whole contract between the shell and a
 * step.
 */
import type {
  OnboardingScreenKey,
  OnboardingStatusResponse,
} from '@types';

export interface OnboardingStepProps {
  readonly status: OnboardingStatusResponse;
  /** "Step N of M · Required" — rendered above the title. */
  readonly eyebrow: string;
  /** Present when there is a safe previous screen. */
  readonly onBack?: () => void;
  /** The next screen in UI order. */
  readonly onNext: () => void;
  readonly goTo: (screen: OnboardingScreenKey) => void;
  /** Re-reads the server status; resolves with the fresh one when available. */
  readonly refresh: () => Promise<OnboardingStatusResponse | undefined>;
}
