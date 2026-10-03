/**
 * Marketing contact section — the Atlas homepage's "talk to us" form
 * (`#contact`).
 *
 * Sends to `POST public/contact`, which lands in the Platform Owner's inbox
 * (`/dashboard/platform/contact-submissions`). Never an Academy's inbox:
 * that is `ContactSection` on an academy website, a different surface.
 *
 * VALIDATION mirrors the server (`utils/marketing-contact.ts`) so a visitor
 * hears about a problem before sending, with every error tied to its field
 * (`aria-invalid` + `aria-describedby`) and focus moved to the first one.
 * The server remains the authority.
 *
 * ANTI-AUTOMATION travels with every submission and is invisible to people:
 * a honeypot field (`company`) kept out of sight, out of the tab order and
 * hidden from assistive tech, and `startedAt` — when the form was first
 * shown — so the server can drop a submission sent faster than a person
 * could type. Both are answered by the server exactly like a real message,
 * so the form has a single success state and never claims more than "we
 * received it".
 *
 * Design system: `design-system/atlas-marketing/MASTER.md` — a divided
 * `MarketingSection`, start-aligned heading block, one `rounded-xl` card,
 * `rounded-md` controls, tokens only, logical properties for RTL.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useSubmitPlatformContact } from '../hooks/useSubmitPlatformContact';
import {
  MARKETING_CONTACT_LIMITS as LIMITS,
  MARKETING_CONTACT_TOPICS,
  marketingContactSchema,
  toSourcePath,
  type MarketingContactParsed,
  type MarketingContactValues,
} from '../utils/marketing-contact';
import { MarketingSection, SectionHeading } from './MarketingSection';

/** The in-page anchor the marketing nav links to (`/#contact`). */
export const MARKETING_CONTACT_ANCHOR = 'contact';

const EMPTY_VALUES: MarketingContactValues = {
  name: '',
  email: '',
  organizationName: '',
  // `undefined` until chosen, so the placeholder shows and the schema's
  // "choose a topic" message applies.
  topic: undefined as unknown as MarketingContactValues['topic'],
  message: '',
  company: '',
};

/** Interpolation values for every `home:contact.errors.*` key. */
const LIMIT_VALUES = {
  nameMin: LIMITS.nameMin,
  nameMax: LIMITS.nameMax,
  emailMax: LIMITS.emailMax,
  organizationMax: LIMITS.organizationMax,
  messageMin: LIMITS.messageMin,
  messageMax: LIMITS.messageMax,
};

export function MarketingContactSection(): JSX.Element {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const formId = useId();
  const submit = useSubmitPlatformContact();
  const startedAt = useRef<number>(Date.now());
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  // Set synchronously on the first submit: two clicks in the same frame
  // both pass validation before `isPending` re-renders the button.
  const inFlight = useRef(false);
  const [isSent, setIsSent] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<MarketingContactValues, unknown, MarketingContactParsed>({
    resolver: zodResolver(marketingContactSchema),
    defaultValues: EMPTY_VALUES,
    mode: 'onTouched',
  });

  // Announce success by moving focus to its heading — the form the visitor
  // was in has just been replaced.
  useEffect(() => {
    if (isSent) successHeadingRef.current?.focus();
  }, [isSent]);

  const fieldId = (name: string) => `${formId}-${name}`;
  const errorId = (name: string) => `${formId}-${name}-error`;
  const isPending = submit.isPending;
  const messageLength = (watch('message') ?? '').length;

  const onSubmit = async (values: MarketingContactParsed) => {
    if (inFlight.current) return;
    inFlight.current = true;
    const company = values.company.trim();
    const sourcePath = toSourcePath(location.pathname);
    try {
      await submit.mutateAsync({
        name: values.name,
        email: values.email,
        ...(values.organizationName
          ? { organizationName: values.organizationName }
          : {}),
        topic: values.topic,
        message: values.message,
        locale: i18n.language?.startsWith('ar') ? 'ar' : 'en',
        ...(sourcePath ? { sourcePath } : {}),
        ...(company ? { company } : {}),
        startedAt: startedAt.current,
      });
      reset(EMPTY_VALUES);
      setIsSent(true);
    } catch {
      // Shown by the failure alert (`submit.isError`); the text is kept.
    } finally {
      inFlight.current = false;
    }
  };

  const startOver = () => {
    submit.reset();
    startedAt.current = Date.now();
    setIsSent(false);
  };

  const fieldError = (name: keyof MarketingContactValues) => {
    const message = errors[name]?.message;
    return message ? (
      <p id={errorId(name)} className="text-sm text-destructive">
        {t(message, LIMIT_VALUES)}
      </p>
    ) : null;
  };

  const describedBy = (name: keyof MarketingContactValues, hint?: string) =>
    [errors[name] ? errorId(name) : null, hint].filter(Boolean).join(' ') ||
    undefined;

  const failureKey =
    submit.error?.kind === 'rateLimited'
      ? 'home:contact.failure.rateLimited'
      : 'home:contact.failure.description';

  return (
    <MarketingSection
      divided
      id={MARKETING_CONTACT_ANCHOR}
      aria-labelledby="home-contact"
      className="scroll-mt-20"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
        <div className="flex flex-col gap-8 lg:col-span-5">
          <SectionHeading
            id="home-contact"
            eyebrow={t('home:contact.eyebrow')}
            title={t('home:contact.title')}
            lead={t('home:contact.description')}
          />
          <ul className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            {(['reply', 'privacy'] as const).map((point) => (
              <li key={point} className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-primary"
                  strokeWidth={1.75}
                  aria-hidden
                />
                <span>{t(`home:contact.points.${point}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 lg:col-span-7 lg:p-8">
          {isSent ? (
            <div
              role="status"
              className="flex flex-col items-start gap-4"
              data-testid="marketing-contact-success"
            >
              <span className="flex size-11 items-center justify-center rounded-md bg-accent text-accent-foreground">
                <Mail className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3
                ref={successHeadingRef}
                tabIndex={-1}
                className="font-display text-xl font-semibold text-foreground focus-visible:outline-none"
              >
                {t('home:contact.success.title')}
              </h3>
              <p className="max-w-[52ch] text-base leading-relaxed text-muted-foreground">
                {t('home:contact.success.description')}
              </p>
              <Button type="button" variant="outline" onClick={startOver}>
                {t('home:contact.success.again')}
              </Button>
            </div>
          ) : (
            <form
              noValidate
              aria-label={t('home:contact.form.label')}
              onSubmit={handleSubmit(onSubmit)}
              className="relative flex flex-col gap-5"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={fieldId('name')}>
                    {t('home:contact.form.name')}
                  </Label>
                  <Input
                    id={fieldId('name')}
                    autoComplete="name"
                    maxLength={LIMITS.nameMax}
                    aria-invalid={!!errors.name}
                    aria-describedby={describedBy('name')}
                    aria-required
                    disabled={isPending}
                    {...register('name')}
                  />
                  {fieldError('name')}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={fieldId('email')}>
                    {t('home:contact.form.email')}
                  </Label>
                  <Input
                    id={fieldId('email')}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    dir="ltr"
                    maxLength={LIMITS.emailMax}
                    aria-invalid={!!errors.email}
                    aria-describedby={describedBy('email')}
                    aria-required
                    disabled={isPending}
                    {...register('email')}
                  />
                  {fieldError('email')}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="flex flex-col gap-2">
                  <Label htmlFor={fieldId('organizationName')}>
                    {t('home:contact.form.organization')}
                  </Label>
                  <Input
                    id={fieldId('organizationName')}
                    autoComplete="organization"
                    maxLength={LIMITS.organizationMax}
                    aria-invalid={!!errors.organizationName}
                    aria-describedby={describedBy('organizationName')}
                    disabled={isPending}
                    {...register('organizationName')}
                  />
                  {fieldError('organizationName')}
                </div>

                <div className="flex flex-col gap-2">
                  <Label htmlFor={fieldId('topic')}>
                    {t('home:contact.form.topic')}
                  </Label>
                  <Controller
                    control={control}
                    name="topic"
                    render={({ field }) => (
                      <Select
                        value={field.value ?? ''}
                        onValueChange={(value) => field.onChange(value)}
                        disabled={isPending}
                      >
                        <SelectTrigger
                          id={fieldId('topic')}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          aria-label={t('home:contact.form.topic')}
                          aria-invalid={!!errors.topic}
                          aria-describedby={describedBy('topic')}
                          aria-required
                        >
                          <SelectValue
                            placeholder={t(
                              'home:contact.form.topicPlaceholder'
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKETING_CONTACT_TOPICS.map((topic) => (
                            <SelectItem key={topic} value={topic}>
                              {t(`home:contact.topics.${topic}`)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {fieldError('topic')}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor={fieldId('message')}>
                  {t('home:contact.form.message')}
                </Label>
                <Textarea
                  id={fieldId('message')}
                  rows={6}
                  maxLength={LIMITS.messageMax}
                  aria-invalid={!!errors.message}
                  aria-describedby={describedBy(
                    'message',
                    errorId('message-count')
                  )}
                  aria-required
                  disabled={isPending}
                  {...register('message')}
                />
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">{fieldError('message')}</div>
                  <p
                    id={errorId('message-count')}
                    className="ms-auto shrink-0 text-xs tabular-nums text-muted-foreground"
                    dir="ltr"
                  >
                    {t('home:contact.form.messageCount', {
                      count: messageLength,
                      max: LIMITS.messageMax,
                    })}
                  </p>
                </div>
              </div>

              {/* Spam trap: out of sight, out of the tab order and hidden
                  from assistive tech, so only a bot fills it in. The name
                  `company` is the trap — the real field is
                  `organizationName` above. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -start-[10000px] size-px overflow-hidden"
              >
                <label htmlFor={fieldId('company')}>Company</label>
                <input
                  id={fieldId('company')}
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  {...register('company')}
                />
              </div>

              {submit.isError ? (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm"
                >
                  <AlertCircle
                    className="mt-0.5 size-5 shrink-0 text-destructive"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <div className="flex flex-col gap-1">
                    <p className="font-medium text-foreground">
                      {t('home:contact.failure.title')}
                    </p>
                    <p className="text-muted-foreground">{t(failureKey)}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('home:contact.form.privacyNote')}
                </p>
                <Button
                  type="submit"
                  size="lg"
                  // Also off while validating, before the request starts.
                  disabled={isPending || isSubmitting}
                  aria-busy={isPending}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Send
                      className="size-4 rtl:-scale-x-100"
                      strokeWidth={2}
                      aria-hidden
                    />
                  )}
                  {isPending
                    ? t('home:contact.form.submitting')
                    : t('home:contact.form.submit')}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </MarketingSection>
  );
}
