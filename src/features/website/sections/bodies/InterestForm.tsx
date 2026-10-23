/**
 * CMS phase 3d (batch C) — the interest form's shared body: every theme
 * draws this form with its own classes (`InterestFormClasses`).
 *
 * It reaches the academy the way the Contact form does — the same endpoint,
 * throttle, spam trap and Messages inbox (`kind: 'interest'`) — naming its
 * published section so the API can check the fields and the chosen option.
 *
 * Accessibility (ui-ux-pro-max forms rules):
 *   - every field has a visible label; optional ones say "(optional)";
 *   - a problem shows under its field (tied by `aria-describedby`, the field
 *     `aria-invalid`) only once the visitor leaves the field, or on submit,
 *     and says how to fix it;
 *   - a refused submit moves focus to the first field to fix; a problem the
 *     server finds is shown on its field the same way;
 *   - the button shows it is sending and cannot be pressed twice; success
 *     replaces the form with the message in a `role="status"` region that
 *     takes focus, at least as tall as the form was, so nothing below moves;
 *   - every control is at least 44px tall; the phone control stays
 *     left-to-right in Arabic, its label and messages follow the page.
 * In a dashboard preview nothing is sent: the form checks itself and says
 * where it would send.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@utils';
import { isApiError } from '@api';
import { publicWebsiteService } from '@services';
import type { InterestFormSectionConfig } from '@types';
import { usePublicWebsiteLocale } from '@/features/website/renderer/PublicWebsiteLocaleContext';
import {
  CONTACT_EMAIL_MAX_LENGTH,
  CONTACT_MESSAGE_MAX_LENGTH,
  CONTACT_NAME_MAX_LENGTH,
} from '@/features/website/constants/website.constants';
import {
  INTEREST_FIELD_ORDER,
  resolveInterestForm,
  validateInterestForm,
  type InterestFieldName,
  type InterestFormValues,
} from './interest-form.logic';
import {
  INTEREST_DEFAULT_PHONE_COUNTRY,
  InterestPhoneField,
  loadInterestPhone,
  useInterestPhoneModule,
} from './InterestPhoneField';

export interface InterestFormClasses {
  /** The `<form>` (and the success panel that replaces it). */
  readonly form?: string;
  readonly label?: string;
  /** The "(optional)" tag after a label. */
  readonly optional?: string;
  /** Every text input, the select and the textarea. */
  readonly control?: string;
  readonly select?: string;
  readonly textarea?: string;
  /** A field's problem. */
  readonly error?: string;
  /** "Fields are required unless marked optional." */
  readonly hint?: string;
  readonly submit?: string;
  /** What the server said when it could not take the form. */
  readonly alert?: string;
  readonly success?: string;
  readonly successIcon?: string;
  readonly successTitle?: string;
  readonly successText?: string;
  /** The preview's "nothing is sent here" line. */
  readonly note?: string;
  readonly phoneTrigger?: string;
  readonly phoneInput?: string;
  /** The phone control's outer box. */
  readonly phoneWrapper?: string;
}

type SubmitState =
  | 'idle'
  | 'submitting'
  | 'success'
  | 'preview'
  | 'error'
  | 'rateLimited'
  | 'unavailable';

/** The API's field names → the form's. */
const SERVER_FIELDS: Readonly<Record<string, InterestFieldName>> = {
  name: 'name',
  phoneNumber: 'phone',
  phoneCountry: 'phone',
  email: 'email',
  choice: 'choice',
  message: 'message',
};

const ALERT_KEYS: Partial<Record<SubmitState, string>> = {
  error: 'website:renderer.interestForm.sendFailed',
  rateLimited: 'website:renderer.interestForm.rateLimited',
  unavailable: 'website:renderer.interestForm.unavailable',
};

const EMPTY_VALUES: InterestFormValues = {
  name: '',
  phoneNumber: '',
  phoneCountry: INTEREST_DEFAULT_PHONE_COUNTRY,
  email: '',
  choice: '',
  message: '',
};

export function InterestForm({
  config,
  sectionId,
  academyId,
  isPublic,
  classes = {},
  labelledBy,
}: {
  readonly config: InterestFormSectionConfig;
  readonly sectionId?: string;
  readonly academyId: string;
  /** The public site sends; previews only check. */
  readonly isPublic: boolean;
  readonly classes?: InterestFormClasses;
  /** The section heading that names the form. */
  readonly labelledBy?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const { locale } = usePublicWebsiteLocale();
  const form = resolveInterestForm(config, locale);
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const refs = {
    name: useRef<HTMLInputElement>(null),
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    choice: useRef<HTMLSelectElement>(null),
    message: useRef<HTMLTextAreaElement>(null),
  };
  const phone = useInterestPhoneModule(formRef);
  const [values, setValues] = useState<InterestFormValues>(EMPTY_VALUES);
  const [touched, setTouched] = useState<ReadonlySet<InterestFieldName>>(
    () => new Set()
  );
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<InterestFieldName, string>>
  >({});
  const [state, setState] = useState<SubmitState>('idle');
  const [reservedHeight, setReservedHeight] = useState<number>();
  const [focusField, setFocusField] = useState<{
    readonly field: InterestFieldName;
  }>();

  const shows = (field: InterestFieldName): boolean =>
    field === 'name' || field === 'phone' || form[field] !== 'hidden';
  const choiceName =
    form.choiceLabel || t('website:renderer.interestForm.choiceDefault');
  const clientErrors = validateInterestForm(form, values, phone?.checkPhone);
  const errorFor = (field: InterestFieldName): string | undefined => {
    if (serverErrors[field]) return t(serverErrors[field]!);
    if (!attempted && !touched.has(field)) return undefined;
    const error = clientErrors[field];
    if (!error) return undefined;
    return t(error.key, {
      ...(error.values ?? {}),
      ...(field === 'choice' ? { label: choiceName } : {}),
    });
  };

  // A refused submit (here or by the server) takes the visitor to the field.
  useEffect(() => {
    if (!focusField) return;
    refs[focusField.field].current?.focus();
    // `refs` holds stable ref objects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusField]);
  useEffect(() => {
    if (state === 'success') successRef.current?.focus();
  }, [state]);

  const update = (field: keyof InterestFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    const formField: InterestFieldName =
      field === 'phoneNumber' || field === 'phoneCountry'
        ? 'phone'
        : (field as InterestFieldName);
    setServerErrors((current) => {
      if (!current[formField]) return current;
      const next = { ...current };
      delete next[formField];
      return next;
    });
    if (state !== 'idle' && state !== 'submitting') setState('idle');
  };
  const leave = (field: InterestFieldName) =>
    setTouched((current) =>
      current.has(field) ? current : new Set([...current, field])
    );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === 'submitting') return;
    setAttempted(true);
    let check = phone?.checkPhone;
    if (!check) {
      try {
        check = (await loadInterestPhone()).checkPhone;
      } catch {
        // The server checks the number itself.
      }
    }
    const errors = validateInterestForm(form, values, check);
    const first = INTEREST_FIELD_ORDER.find(
      (field) => shows(field) && errors[field]
    );
    if (first) {
      setFocusField({ field: first });
      return;
    }
    if (!isPublic) {
      setState('preview');
      return;
    }
    const company = String(
      new FormData(event.currentTarget).get('company') ?? ''
    ).trim();
    const email = form.email === 'hidden' ? '' : values.email.trim();
    const message = form.message === 'hidden' ? '' : values.message.trim();
    const choice = form.choice === 'hidden' ? '' : values.choice;
    setState('submitting');
    try {
      await publicWebsiteService.submitContactMessage(academyId, {
        kind: 'interest',
        sectionId: sectionId ?? '',
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim(),
        phoneCountry: values.phoneCountry,
        locale,
        ...(email ? { email } : {}),
        ...(message ? { message } : {}),
        ...(choice ? { choice } : {}),
        // Sent only when filled — i.e. by a bot (see the field below).
        ...(company ? { company } : {}),
      });
      setReservedHeight(formRef.current?.offsetHeight);
      setState('success');
    } catch (error) {
      if (isApiError(error) && error.kind === 'validation') {
        const found: Partial<Record<InterestFieldName, string>> = {};
        for (const violation of error.violations ?? []) {
          const field = SERVER_FIELDS[violation.field];
          if (field && !found[field]) {
            found[field] =
              field === 'phone'
                ? 'common:phone.errors.invalid'
                : violation.messageKey === 'validation:invalidChoice'
                  ? 'website:renderer.interestForm.errors.choiceGone'
                  : 'website:renderer.interestForm.errors.server';
          }
        }
        const firstServer = INTEREST_FIELD_ORDER.find((field) => found[field]);
        if (firstServer) {
          setServerErrors(found);
          setFocusField({ field: firstServer });
          setState('idle');
          return;
        }
      }
      setState(
        isApiError(error) && error.kind === 'rateLimited'
          ? 'rateLimited'
          : isApiError(error) && error.kind === 'notFound'
            ? 'unavailable'
            : 'error'
      );
    }
  };

  if (state === 'success') {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        data-interest-success=""
        style={reservedHeight ? { minHeight: reservedHeight } : undefined}
        className={cn(
          'flex flex-col items-center justify-center gap-3 text-center outline-none',
          classes.form,
          classes.success
        )}
      >
        <CheckCircle2
          aria-hidden
          className={cn('size-10', classes.successIcon)}
          strokeWidth={1.75}
        />
        <p className={classes.successTitle}>
          {t('website:renderer.interestForm.successTitle')}
        </p>
        <p className={cn('max-w-md', classes.successText)}>
          {form.successMessage ||
            t('website:renderer.interestForm.successDefault')}
        </p>
      </div>
    );
  }

  const fieldIds = (field: InterestFieldName) => ({
    input: `${id}-${field}`,
    error: `${id}-${field}-error`,
  });
  const describedBy = (field: InterestFieldName) =>
    errorFor(field) ? fieldIds(field).error : undefined;
  const hasOptional = (['email', 'choice', 'message'] as const).some(
    (field) => form[field] === 'optional'
  );

  const field = (
    name: InterestFieldName,
    label: string,
    control: ReactNode,
    wide = false
  ) => {
    const message = errorFor(name);
    return (
      <div className={cn('min-w-0 space-y-1.5', wide && 'sm:col-span-2')}>
        <label
          htmlFor={fieldIds(name).input}
          className={cn('block', classes.label)}
        >
          {label}
          {name !== 'name' && name !== 'phone' && form[name] === 'optional' ? (
            <span className={cn('ms-1.5 font-normal', classes.optional)}>
              {t('website:renderer.interestForm.optional')}
            </span>
          ) : null}
        </label>
        {control}
        {/* The message's box is always there, so nothing below jumps when it appears. */}
        <p
          id={fieldIds(name).error}
          className={cn('min-h-5 text-sm', classes.error)}
        >
          {message ?? ''}
        </p>
      </div>
    );
  };
  const control = (name: InterestFieldName) => ({
    id: fieldIds(name).input,
    'aria-invalid': errorFor(name) ? true : undefined,
    'aria-describedby': describedBy(name),
    onBlur: () => leave(name),
  });
  const alertKey = ALERT_KEYS[state];

  return (
    <form
      ref={formRef}
      noValidate
      aria-labelledby={labelledBy}
      onSubmit={handleSubmit}
      className={cn('relative', classes.form)}
      data-interest-form=""
    >
      {hasOptional ? (
        <p className={cn('mb-4 text-sm', classes.hint)}>
          {t('website:renderer.interestForm.requiredNote')}
        </p>
      ) : null}
      <div className="grid gap-x-5 gap-y-1 sm:grid-cols-2">
        {field(
          'name',
          t('website:renderer.interestForm.name'),
          <input
            ref={refs.name}
            {...control('name')}
            name="name"
            autoComplete="name"
            maxLength={CONTACT_NAME_MAX_LENGTH}
            aria-required
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            className={cn('min-h-11 w-full', classes.control)}
          />
        )}
        {field(
          'phone',
          t('website:renderer.interestForm.phone'),
          <InterestPhoneField
            phone={phone}
            id={fieldIds('phone').input}
            inputRef={refs.phone}
            number={values.phoneNumber}
            country={values.phoneCountry}
            onNumberChange={(next) => update('phoneNumber', next)}
            onCountryChange={(next) => update('phoneCountry', next)}
            onBlur={() => leave('phone')}
            invalid={!!errorFor('phone')}
            describedBy={describedBy('phone')}
            triggerClassName={cn('h-11', classes.phoneTrigger)}
            inputClassName={cn('h-11', classes.phoneInput)}
            wrapperClassName={classes.phoneWrapper}
          />
        )}
        {shows('email')
          ? field(
              'email',
              t('website:renderer.interestForm.email'),
              <input
                ref={refs.email}
                {...control('email')}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                dir="ltr"
                maxLength={CONTACT_EMAIL_MAX_LENGTH}
                aria-required={form.email === 'required' || undefined}
                value={values.email}
                onChange={(event) => update('email', event.target.value)}
                className={cn('min-h-11 w-full text-start', classes.control)}
              />
            )
          : null}
        {shows('choice')
          ? field(
              'choice',
              choiceName,
              <select
                ref={refs.choice}
                {...control('choice')}
                name="choice"
                aria-required={form.choice === 'required' || undefined}
                value={values.choice}
                onChange={(event) => {
                  update('choice', event.target.value);
                  leave('choice');
                }}
                className={cn(
                  'min-h-11 w-full',
                  classes.control,
                  classes.select
                )}
              >
                <option value="">
                  {t('website:renderer.interestForm.choosePrompt')}
                </option>
                {form.options.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            )
          : null}
        {shows('message')
          ? field(
              'message',
              t('website:renderer.interestForm.message'),
              <textarea
                ref={refs.message}
                {...control('message')}
                name="message"
                rows={4}
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                aria-required={form.message === 'required' || undefined}
                value={values.message}
                onChange={(event) => update('message', event.target.value)}
                className={cn(
                  'min-h-28 w-full py-3',
                  classes.control,
                  classes.textarea
                )}
              />,
              true
            )
          : null}
      </div>
      {/* Spam trap: out of sight, out of the tab order and hidden from
          assistive tech, so only a bot fills it in — the Contact form's. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -start-[10000px] size-px overflow-hidden"
      >
        <label htmlFor={`${id}-company`}>Company</label>
        <input
          id={`${id}-company`}
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </div>
      <div className="mt-3 space-y-3">
        <button
          type="submit"
          className={cn('min-h-11 w-full sm:w-auto', classes.submit)}
          aria-disabled={state === 'submitting' || undefined}
        >
          {state === 'submitting' ? (
            <Loader2
              className="size-4 animate-spin motion-reduce:animate-none"
              aria-hidden
            />
          ) : null}
          {state === 'submitting'
            ? t('website:renderer.interestForm.sending')
            : form.submitLabel || t('website:renderer.interestForm.submit')}
        </button>
        {alertKey ? (
          <p role="alert" className={cn('text-sm', classes.alert)}>
            {t(alertKey)}
          </p>
        ) : null}
        {state === 'preview' ? (
          <p role="status" className={cn('text-sm', classes.note)}>
            {t('website:renderer.interestForm.previewNote')}
          </p>
        ) : null}
      </div>
    </form>
  );
}
