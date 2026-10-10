/**
 * Academy Setup Form.
 *
 * The provisioning request form — academy name, Atlas address (with live
 * availability and the name-following suggestion), theme and website
 * setup mode — extracted from `ProvisioningStartPage` so the New Customer
 * Onboarding shell can render the SAME form rather than a second one.
 *
 * It only creates the `ProvisioningRequest`; what happens next is the
 * caller's decision (`onCreated`): the page navigates to the status
 * screen, the onboarding shell stays put and shows progress. Plan-limit
 * gating stays with the caller too — the backend enforces the limit
 * regardless, and a refusal surfaces through the form's error state.
 *
 * W2 — the theme is always set (the platform default, pre-selected), so the
 * website is always built; the "Logo & colours" choice is sent WITH the
 * request (`brand`), validated and applied server-side. Only the logo file
 * waits in the page for its Academy (`pendingLogoStore`). Another tab that
 * already claimed the same address answers 409 with its request id, and
 * this form offers to follow that request instead.
 */
import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { ErrorState } from '@components/feedback';
import { StatusBadge } from '@components/data-display';
import { Button } from '@/components/ui/button';
import { cn } from '@utils';
import {
  listWebsiteThemes,
  SetupBrandStudio,
  type SetupBrandingChoice,
} from '@features/website';
import { DEFAULT_WEBSITE_THEME_KEY } from '@types';
import type { ProvisioningRequest, WebsiteThemeKey } from '@types';
import { isApiError } from '@api';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useSlugSuggestion, useUnsavedChanges } from '@hooks';
import { useNameConflictError, useServerValidation } from '@forms';
import { MAX_SUBDOMAIN_LENGTH } from '../constants/provisioning.constants';
import {
  useCheckSubdomainAvailability,
  useCreateProvisioningRequest,
} from '../hooks';
import {
  createProvisioningRequestSchema,
  type CreateProvisioningRequestFormData,
} from '../schemas/provisioning.schemas';
import { generateProvisioningIdempotencyKey } from '../utils/idempotency.utils';
import { pendingLogoStore } from '../logo/pending-logo';
import { pendingFaviconStore } from '../logo/pending-favicon';
import { SetupThemePicker } from './SetupThemePicker';
import {
  SetupPaymentMethods,
  type SetupPaymentMethodsHandle,
} from './SetupPaymentMethods';

export interface AcademySetupFormProps {
  readonly organizationId: string;
  /** Called with the created request once the backend accepted it. */
  readonly onCreated: (request: ProvisioningRequest) => void;
  /** Primary action label; the provisioning page keeps its own default. */
  readonly submitLabelKey?: string;
  /** Show the "Logo, colours & favicon" block open (the onboarding shell). */
  readonly brandStudioOpen?: boolean;
}

export function AcademySetupForm({
  organizationId,
  onCreated,
  submitLabelKey = 'provisioning:start.submit',
  brandStudioOpen = false,
}: AcademySetupFormProps): JSX.Element {
  const { t } = useTranslation();
  const createRequest = useCreateProvisioningRequest();

  const idempotencyKey = useState(() =>
    generateProvisioningIdempotencyKey()
  )[0];

  const form = useForm<CreateProvisioningRequestFormData>({
    resolver: zodResolver(createProvisioningRequestSchema),
    // Phase 6 — `websiteSetupMode` is pre-selected to `'complete'`: the
    // easiest action (submit without touching this field) should be the
    // one that produces a presentable site, not an empty shell — see the
    // Bilingual Academy Websites specification, §3.2 ("make the easiest
    // action the correct action"). This is a UI default only; the
    // backend's own schema default for an OMITTED value is `'empty'` —
    // deliberately different, see `CreateProvisioningRequestPayload.
    // websiteSetupMode`'s own doc comment.
    defaultValues: {
      academyName: '',
      requestedSubdomain: '',
      // W2 — the platform default theme, pre-selected: the website is always
      // built (an unset theme used to skip generation silently).
      selectedThemeKey: DEFAULT_WEBSITE_THEME_KEY,
      websiteSetupMode: 'complete',
    },
  });

  // Warns before this editor is left with unsaved work — both on
  // in-app navigation (via the shared registry the route blocker
  // reads) and on tab close or refresh.
  const { markSaved } = useUnsavedChanges({
    isDirty: form.formState.isDirty,
  });

  const themes = listWebsiteThemes();
  const selectedThemeKey = form.watch('selectedThemeKey');
  const websiteSetupMode = form.watch('websiteSetupMode');

  useServerValidation(form, createRequest.error);
  // W4 — academy names are unique platform-wide; a taken name is shown on
  // the academy-name field (the request is refused when it is made).
  const nameConflict = useNameConflictError(form, createRequest.error);

  const subdomainValue = form.watch('requestedSubdomain');
  const availability = useCheckSubdomainAvailability(subdomainValue);

  /*
    P55 — the Atlas address follows the Academy name until the owner edits
    it themselves. `MAX_SUBDOMAIN_LENGTH` is passed so a suggestion can
    never be born failing the very schema that validates it, and the
    existing availability check below then runs against the suggestion
    exactly as it does against a typed value — there is no separate
    "is this suggestion free?" path.
  */
  const academyNameValue = form.watch('academyName');
  const slugSuggestion = useSlugSuggestion({
    title: academyNameValue,
    slug: subdomainValue,
    maxLength: MAX_SUBDOMAIN_LENGTH,
    onSuggest: (next) =>
      // `shouldDirty` so the unsaved-changes guard treats a suggested
      // address like any other unsaved input; `shouldValidate` so an
      // out-of-bounds suggestion surfaces immediately rather than at submit.
      form.setValue('requestedSubdomain', next, {
        shouldDirty: true,
        shouldValidate: true,
      }),
  });

  // W2 — the latest "Logo & colours" choice; its palette travels with the
  // request, its logo file is attached once the Academy exists.
  // The same choice also colours the theme picker's live previews.
  const branding = useRef<SetupBrandingChoice | null>(null);
  const [brandingChoice, setBrandingChoice] =
    useState<SetupBrandingChoice | null>(null);
  const onBrandingChange = useCallback((value: SetupBrandingChoice | null) => {
    branding.current = value;
    setBrandingChoice(value);
  }, []);

  // Another tab (or an earlier submit with a different form) already set
  // up this address: the server names that request so we can follow it.
  const inProgressRequestId = (() => {
    const error = createRequest.error;
    if (
      !isApiError(error) ||
      error.messageKey !== 'errors.provisioning.subdomainRequestInProgress'
    ) {
      return undefined;
    }
    const id = error.details?.requestId;
    return typeof id === 'string' ? id : undefined;
  })();

  // Academy Manual Payments — the "Payment methods" section validates and
  // hands over its own sub-forms at submit time.
  const paymentMethodsRef = useRef<SetupPaymentMethodsHandle>(null);

  const onSubmit = async (data: CreateProvisioningRequestFormData) => {
    const paymentMethods = await paymentMethodsRef.current?.collect();
    // `null`: a chosen method is incomplete; the section shows why.
    if (paymentMethods === null) return;
    const choice = branding.current;
    const brand =
      choice && (choice.palette || choice.logoFile)
        ? {
            ...(choice.palette
              ? {
                  palette: choice.palette as unknown as Readonly<
                    Record<string, unknown>
                  >,
                }
              : {}),
            ...(choice.logoFile ? { logoPending: true } : {}),
          }
        : undefined;
    createRequest.mutate(
      {
        organizationId,
        payload: {
          academyName: data.academyName,
          requestedSubdomain: data.requestedSubdomain,
          selectedThemeKey: data.selectedThemeKey ?? DEFAULT_WEBSITE_THEME_KEY,
          websiteSetupMode: data.websiteSetupMode,
          ...(brand ? { brand } : {}),
          ...(paymentMethods ? { paymentMethods } : {}),
          idempotencyKey,
        },
      },
      {
        onSuccess: (request) => {
          if (choice?.logoFile) {
            pendingLogoStore.set(request.id, choice.logoFile);
          }
          if (choice?.faviconFile) {
            pendingFaviconStore.set(request.id, choice.faviconFile);
          }
          // Submitted means saved: clear the unsaved-changes guard so the
          // move to the status page isn't met with "Leave without saving?".
          // `reset` alone reaches the guard only after the next render;
          // `markSaved` clears it before `onCreated` navigates.
          form.reset(data);
          markSaved();
          onCreated(request);
        },
      }
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="academyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('provisioning:start.academyNameLabel')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="requestedSubdomain"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('provisioning:start.subdomainLabel')}</FormLabel>
              <div className="flex items-center gap-2">
                {/* `FormControl` wires the label, description and error to
                    its direct child, so it wraps the input itself. */}
                <FormControl>
                  <Input
                    {...field}
                    className="flex-1"
                    // `dir="ltr"` because a subdomain is always ASCII
                    // and must read left-to-right even on an Arabic
                    // page — otherwise the caret and the hyphens sit
                    // on the wrong side of what the user is typing.
                    dir="ltr"
                    data-ltr-content
                    onChange={(event) => {
                      // Latch FIRST, then apply: the edit must be
                      // recorded before any re-render can let a
                      // pending title change overwrite it.
                      slugSuggestion.onSlugEdited();
                      field.onChange(event);
                    }}
                  />
                </FormControl>
                {field.value ? (
                  availability.isLoading ? (
                    <Loader2
                      className="size-4 shrink-0 animate-spin text-muted-foreground"
                      aria-hidden
                    />
                  ) : availability.data?.status === 'available' ? (
                    <CheckCircle2
                      className="size-4 shrink-0 text-success"
                      aria-hidden
                    />
                  ) : availability.data ? (
                    <XCircle
                      className="size-4 shrink-0 text-destructive"
                      aria-hidden
                    />
                  ) : null
                ) : null}
              </div>
              <FormDescription>
                {t(
                  slugSuggestion.isCustomized
                    ? 'provisioning:start.subdomainHelp'
                    : 'provisioning:start.subdomainSuggested'
                )}
              </FormDescription>
              {field.value &&
              availability.data?.status !== 'available' &&
              availability.data ? (
                <p className="text-sm text-destructive">
                  {t(
                    `provisioning:start.subdomainStatus.${availability.data.status}`
                  )}
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Phase P19 — real theme selection during onboarding. W2: a
            single-choice radio group with the platform default
            pre-selected — a theme can be changed, never cleared, so the
            website is always built with starter pages. Theme 2 — each
            option is a live preview of the real site in that theme. */}
        <FormField
          control={form.control}
          name="selectedThemeKey"
          render={() => (
            <FormItem>
              <FormLabel>{t('provisioning:start.themeLabel')}</FormLabel>
              <FormDescription>
                {t('provisioning:start.themeHelp')}
              </FormDescription>
              <SetupThemePicker
                themes={themes}
                value={selectedThemeKey}
                onChange={(key) =>
                  form.setValue('selectedThemeKey', key, { shouldDirty: true })
                }
                label={t('provisioning:start.themeLabel')}
                academyName={academyNameValue}
                branding={brandingChoice}
              />
            </FormItem>
          )}
        />

        {/* Theme 1 plan §F.4.3 — optional "Logo & colours", beside the
            theme picker, with a live mini-preview of the chosen theme. */}
        <SetupBrandStudio
          themeKey={
            (selectedThemeKey as WebsiteThemeKey | undefined) ??
            'modern-education'
          }
          academyName={academyNameValue}
          onChange={onBrandingChange}
          defaultOpen={brandStudioOpen}
        />

        {/*
          Phase 6 (Bilingual Academy Websites) — the setup-mode
          choice lives directly beneath the existing theme picker,
          on the SAME screen, rather than a new onboarding step
          (see the specification's §3.1 for why this insertion
          point was chosen over a bigger one). Two large, plain-
          language cards — never "Empty Academy"/"Complete Website"
          to the client, that framing is for engineering docs only.
        */}
        <FormField
          control={form.control}
          name="websiteSetupMode"
          render={() => (
            <FormItem>
              <FormLabel>{t('provisioning:start.setupModeLabel')}</FormLabel>
              <FormDescription>
                {t('provisioning:start.setupModeHelp')}
              </FormDescription>
              <div className="grid gap-3 sm:grid-cols-2">
                {(['complete', 'empty'] as const).map((mode) => {
                  const isSelected = websiteSetupMode === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() =>
                        form.setValue('websiteSetupMode', mode, {
                          shouldDirty: true,
                        })
                      }
                      className={cn(
                        'flex flex-col gap-1.5 rounded-lg border p-4 text-start transition-colors',
                        isSelected
                          ? 'border-2 border-primary'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <span className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {t(`provisioning:start.setupMode.${mode}.title`)}
                        </span>
                        {mode === 'complete' ? (
                          <StatusBadge
                            labelKey="provisioning:start.setupMode.recommended"
                            tone="info"
                          />
                        ) : isSelected ? (
                          <Check
                            className="size-4 text-primary"
                            strokeWidth={2}
                            aria-hidden
                          />
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t(`provisioning:start.setupMode.${mode}.description`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </FormItem>
          )}
        />

        <SetupPaymentMethods ref={paymentMethodsRef} />

        <div className="flex items-center justify-end">
          <Button
            type="submit"
            disabled={
              createRequest.isPending ||
              availability.data?.status !== 'available'
            }
          >
            {createRequest.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t('provisioning:start.creating')}
              </>
            ) : (
              t(submitLabelKey)
            )}
          </Button>
        </div>

        {inProgressRequestId ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-lg border border-warning/40 bg-warning-surface p-4 sm:flex-row sm:items-center"
          >
            <p className="flex-1 text-sm text-foreground">
              {t('provisioning:start.addressInProgress')}
            </p>
            <Button
              asChild
              variant="outline"
              size="sm"
              className="min-h-11 sm:min-h-9"
            >
              <Link
                to={buildPath(DASHBOARD_ROUTES.provisioningStatus, {
                  requestId: inProgressRequestId,
                })}
              >
                {t('provisioning:start.followInProgress')}
              </Link>
            </Button>
          </div>
        ) : createRequest.error &&
          isApiError(createRequest.error) &&
          createRequest.error.messageKey ===
            'errors.provisioning.subdomainUnavailable' ? (
          <p role="alert" className="text-sm text-destructive">
            {t('errors:provisioning.subdomainUnavailable')}
          </p>
        ) : createRequest.error && !nameConflict ? (
          <ErrorState onRetry={() => void form.handleSubmit(onSubmit)()} />
        ) : null}
      </form>
    </Form>
  );
}
