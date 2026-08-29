/**
 * Provider composition.
 *
 * Order is deliberate and load-bearing:
 *  1. ErrorBoundary  — must survive a failure in any provider below it.
 *  2. Theme          — resolved before paint to avoid a flash of the wrong theme.
 *  3. Localization   — must precede anything that translates text.
 *  4. Identity       — authentication state, must precede query provider.
 *  5. Platform       — global platform state, must follow identity.
 *  6. Toast          — required by the query provider to report failures.
 *  7. Query          — data layer, available to every feature.
 *  8. Dialog         — confirmations, available to every feature.
 *  9. Loading        — global blocking indicator, outermost visual layer.
 * 10. Tooltip        — Radix provider required by tooltip-bearing components.
 *
 * Business providers are added by the prompts that introduce them; they belong
 * inside this composition, not around it.
 */
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { ErrorBoundary } from "./error/ErrorBoundary";
import { AtlasThemeProvider } from "./theme/ThemeProvider";
import { AtlasLocalizationProvider } from "./localization/LocalizationProvider";
import { AtlasIdentityProvider } from "./identity/IdentityProvider";
import { AtlasPlatformProvider } from "./platform/PlatformProvider";
import { AtlasToastProvider } from "./toast/ToastProvider";
import { AtlasQueryProvider } from "./query/QueryProvider";
import { AtlasDialogProvider } from "./dialog/DialogProvider";
import { AtlasLoadingProvider } from "./loading/LoadingProvider";

export interface AppProvidersProps {
  readonly children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps): JSX.Element {
  return (
    <ErrorBoundary>
      <AtlasThemeProvider>
        <AtlasLocalizationProvider>
          <AtlasIdentityProvider>
            <AtlasPlatformProvider>
              <AtlasToastProvider>
                <AtlasQueryProvider>
                  <AtlasDialogProvider>
                    <AtlasLoadingProvider>
                      <TooltipProvider delayDuration={200}>
                        {children}
                        {/*
                          Found during a real browser acceptance test: 24
                          pages call `toast()` from `@/hooks/use-toast` (a
                          self-contained shadcn/Radix toast store, entirely
                          separate from `AtlasToastProvider`'s sonner-based
                          `notifySuccess`/`notifyError`) — its own
                          `<Toaster/>` was never mounted anywhere in this
                          tree, so every one of those toasts (including
                          `StudentCourseDetailsPage`'s enroll-error message,
                          confirmed live: a paid course's failed enrollment
                          produced a real 403 with zero user-facing
                          feedback) was silently swallowed. Mounting it here
                          is the minimal, safe fix — it makes those 24
                          already-written call sites work as their authors
                          clearly intended, without rewriting each one's
                          call shape to the other toast system's API.
                          Consolidating onto one toast system end-to-end is
                          a separate, larger cleanup left for a future pass.
                        */}
                        <Toaster />
                      </TooltipProvider>
                    </AtlasLoadingProvider>
                  </AtlasDialogProvider>
                </AtlasQueryProvider>
              </AtlasToastProvider>
            </AtlasPlatformProvider>
          </AtlasIdentityProvider>
        </AtlasLocalizationProvider>
      </AtlasThemeProvider>
    </ErrorBoundary>
  );
}
