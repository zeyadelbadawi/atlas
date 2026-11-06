/**
 * B9 (UX audit) — the academy website's Contact form behaviour, shared by
 * every theme's form; the themes keep their own markup and classes.
 *
 *   - checked with the API's own rules (`contact-form.logic.ts`) in the
 *     page's language; a problem shows under its field once the visitor
 *     leaves it, or on Send, and Send moves focus to the first one;
 *   - the browser's own bubbles are off (`noValidate` on the form), and
 *     no field cuts what is typed or pasted: a counter shows the length
 *     and a value over the limit is refused with the limit;
 *   - a refusal from the server lands on its field; a failure no field can
 *     show is one alert with the real reason (wait for a 429, the academy's
 *     side for a 5xx, the connection only for a real network failure) that
 *     takes focus and, where it helps, offers Try again with the text kept;
 *   - a sent message replaces the form with a status that takes focus.
 *
 * Plain React state, no form library: this runs on every academy page that
 * has a Contact section, in every theme (see `validateContactForm`).
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';
import { parseValidationMessage } from '@forms/validation-message';
import { publicWebsiteService } from '@services';
import {
  CONTACT_FIELD_MAX,
  CONTACT_FIELD_ORDER,
  EMPTY_CONTACT_VALUES,
  classifyContactFailure,
  contactFieldViolations,
  serverLength,
  validateContactForm,
  type ContactFailure,
  type ContactFieldName,
  type ContactFormValues,
} from './contact-form.logic';

const LABEL_KEYS: Readonly<Record<ContactFieldName, string>> = {
  name: 'website:renderer.contactNameLabel',
  email: 'website:renderer.contactEmailLabel',
  message: 'website:renderer.contactMessageLabel',
};

/** A counter shows from this share of the limit (the message always shows one). */
const COUNT_FROM = 0.8;

type FieldElement = HTMLInputElement | HTMLTextAreaElement;

export interface ContactFieldState {
  /** The control's id, for its `<label htmlFor>`. */
  readonly id: string;
  readonly errorId: string;
  readonly countId: string;
  /** The field's problem, in the page's language. */
  readonly error?: string;
  /** "12 / 5000 characters", when a counter shows. */
  readonly count?: string;
  /** Over the limit (the counter shows it). */
  readonly over: boolean;
  /** Spread on the `<input>` / `<textarea>`. */
  readonly controlProps: {
    readonly id: string;
    readonly name: ContactFieldName;
    readonly value: string;
    readonly onChange: (event: ChangeEvent<FieldElement>) => void;
    readonly onBlur: () => void;
    readonly ref: (element: FieldElement | null) => void;
    readonly required: true;
    readonly 'aria-required': true;
    readonly 'aria-invalid'?: true;
    readonly 'aria-describedby'?: string;
  };
}

export type ContactFormStatus = 'idle' | 'sending' | 'sent';

export function useContactForm(academyId: string) {
  const { t } = useTranslation();
  const baseId = useId();
  const [values, setValues] = useState<ContactFormValues>(EMPTY_CONTACT_VALUES);
  const [touched, setTouched] = useState<ReadonlySet<ContactFieldName>>(
    () => new Set()
  );
  const [attempted, setAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<ContactFieldName, string>>
  >({});
  const [status, setStatus] = useState<ContactFormStatus>('idle');
  const [failure, setFailure] = useState<ContactFailure | null>(null);
  const [failureVersion, setFailureVersion] = useState(0);
  const [focusRequest, setFocusRequest] = useState<{
    readonly field: ContactFieldName;
  }>();
  // Set synchronously: two presses in one frame both pass validation
  // before `status` re-renders the button.
  const inFlight = useRef(false);
  const elements = useRef<Partial<Record<ContactFieldName, FieldElement>>>({});
  const alertRef = useRef<HTMLDivElement>(null);
  // What the last press landed on: leaving a field by pressing Send must not
  // show that field's problem first — the message appearing would push Send
  // down mid-click and the press would be lost. Send checks every field.
  const pressedSubmit = useRef(false);
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      pressedSubmit.current = !!target?.closest?.('button[type="submit"]');
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    return () =>
      document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);
  const successRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (failure) alertRef.current?.focus();
  }, [failure, failureVersion]);
  useEffect(() => {
    if (status === 'sent') successRef.current?.focus();
  }, [status]);
  useEffect(() => {
    if (focusRequest) elements.current[focusRequest.field]?.focus();
  }, [focusRequest]);

  const clientErrors = validateContactForm(values);

  const send = useCallback(async () => {
    if (inFlight.current) return;
    setAttempted(true);
    const problems = validateContactForm(values);
    const firstProblem = CONTACT_FIELD_ORDER.find((field) => problems[field]);
    if (firstProblem) {
      setServerErrors({});
      setFocusRequest({ field: firstProblem });
      return;
    }
    inFlight.current = true;
    setFailure(null);
    setStatus('sending');
    const company = values.company.trim();
    try {
      await publicWebsiteService.submitContactMessage(academyId, {
        name: values.name.trim(),
        email: values.email.trim(),
        message: values.message.trim(),
        // Sent only when filled — i.e. by a bot (the hidden field).
        ...(company ? { company } : {}),
      });
      setValues(EMPTY_CONTACT_VALUES);
      setTouched(new Set());
      setAttempted(false);
      setServerErrors({});
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
      const onFields = contactFieldViolations(error);
      const first = CONTACT_FIELD_ORDER.find((field) => onFields[field]);
      if (first) {
        setServerErrors(onFields);
        setFocusRequest({ field: first });
        return;
      }
      setFailure(classifyContactFailure(error));
      setFailureVersion((version) => version + 1);
    } finally {
      inFlight.current = false;
    }
  }, [academyId, values]);

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void send();
  };
  const retry = () => void send();
  const sendAnother = useCallback(() => {
    setValues(EMPTY_CONTACT_VALUES);
    setTouched(new Set());
    setAttempted(false);
    setServerErrors({});
    setFailure(null);
    setStatus('idle');
  }, []);

  const update = (name: keyof ContactFormValues, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    if (name !== 'company') {
      setServerErrors((current) => {
        if (!current[name]) return current;
        const next = { ...current };
        delete next[name];
        return next;
      });
    }
  };

  const errorText = (name: ContactFieldName): string | undefined => {
    const message =
      serverErrors[name] ??
      (attempted || touched.has(name) ? clientErrors[name] : undefined);
    if (!message) return undefined;
    const { key, values: packed } = parseValidationMessage(message);
    return t(key, { field: t(LABEL_KEYS[name]), ...packed });
  };

  const field = (name: ContactFieldName): ContactFieldState => {
    const id = `${baseId}-${name}`;
    const errorId = `${id}-error`;
    const countId = `${id}-count`;
    const error = errorText(name);
    const max = CONTACT_FIELD_MAX[name];
    const length = serverLength(values[name].trim());
    const showCount = name === 'message' || length >= max * COUNT_FROM;
    const describedBy =
      [error ? errorId : null, showCount ? countId : null]
        .filter(Boolean)
        .join(' ') || undefined;
    return {
      id,
      errorId,
      countId,
      error,
      count: showCount
        ? t('common:form.characterCount', { count: length, max })
        : undefined,
      over: length > max,
      controlProps: {
        id,
        name,
        value: values[name],
        onChange: (event) => update(name, event.target.value),
        onBlur: () => {
          if (pressedSubmit.current) return;
          setTouched((current) =>
            current.has(name) ? current : new Set([...current, name])
          );
        },
        ref: (element) => {
          if (element) elements.current[name] = element;
          else delete elements.current[name];
        },
        required: true,
        'aria-required': true,
        ...(error ? { 'aria-invalid': true as const } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      },
    };
  };

  /** The spam trap's props (a bot fills it; people never meet it). */
  const register = (name: 'company') => ({
    name,
    value: values.company,
    onChange: (event: ChangeEvent<HTMLInputElement>) =>
      update(name, event.target.value),
  });

  return {
    register,
    onSubmit,
    status,
    isSending: status === 'sending',
    failure,
    retry,
    sendAnother,
    field,
    alertRef,
    successRef,
    trapId: `${baseId}-company`,
  };
}

export type ContactFormController = ReturnType<typeof useContactForm>;
