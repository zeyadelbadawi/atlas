/**
 * Section buttons in the Section Editor (CMS phase 3).
 *
 * `CtaFieldEditor` edits one button: its label, where it goes and, inside a
 * button list, how it looks. A button goes to one of: a page of the site, a
 * course, a web address, a WhatsApp chat, a phone call, or the Academy's own
 * sign-up / sign-in page. Which one is read from the field that is set
 * (`inferLinkType`), never stored separately, and choosing another clears
 * the others, so a button never carries a stale target.
 *
 * `SectionButtonsEditor` is the list of up to three buttons a hero, CTA
 * band, feature split or About section has. They are stored in the named
 * slots `cta` / `secondaryCta` / `tertiaryCta` (see `SECTION_BUTTON_SLOTS`),
 * so a page saved before a section could have three buttons reads exactly as
 * it did; the list writes back to the slots in order, so removing or moving
 * a button closes the gap.
 *
 * Each button is a collapsed row (label and where it goes) that opens to
 * edit — progressive disclosure, so three buttons never become one long
 * form. Moving uses buttons, not dragging, so it works by keyboard and
 * touch. A phone number is only checked once its field is left (not on
 * every keystroke), and a button still missing its destination says so on
 * its row.
 */
import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ExternalLink,
  FileText,
  GraduationCap,
  LogIn,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  PhoneNumberInput,
  callingCodeOf,
  checkPhone,
  defaultPhoneCountry,
  formatInternational,
  impliedCountry,
  toAsciiDigits,
  type CountryCode,
} from '@/shared/components/phone';
import { cn } from '@utils';
import { useCourses } from '@features/course';
import {
  LocalizedTextField,
  type LocalizedFieldErrors,
} from './LocalizedTextField';
import {
  CTA_STYLES,
  MAX_CTA_LABEL_LENGTH,
  MAX_CTA_WHATSAPP_MESSAGE_LENGTH,
} from '../constants/website.constants';
import { isSafeExternalUrl } from '../utils/url-safety.utils';
import {
  EMPTY_LOCALIZED_TEXT,
  resolveLocalizedText,
} from '../utils/localized-text.utils';
import { resolvePagePath } from '../utils/link-resolution.utils';
import {
  SECTION_BUTTON_SLOTS,
  type LocalizedText,
  type SectionButtonSlot,
  type SectionButtons,
  type WebsiteCta,
  type WebsiteCtaStyle,
  type WebsitePage,
} from '@types';

/**
 * The translated message for one field path, or `undefined` when it has
 * none. `maxLength` is the field's own limit: a field that has one reports
 * its over-limit text itself (live counter), so that issue is skipped here.
 */
export type FieldErrorLookup = (
  path: string,
  labelKey: string,
  maxLength?: number
) => string | undefined;

/** Both languages' messages for a localized field at `path`. */
export function localizedErrors(
  errorFor: FieldErrorLookup,
  path: string,
  labelKey: string,
  maxLength?: number
): LocalizedFieldErrors {
  return {
    en: errorFor(`${path}.en`, labelKey, maxLength),
    ar: errorFor(`${path}.ar`, labelKey, maxLength),
  };
}

/** Where a button goes — derived from which field is populated, never stored separately (see `WebsiteCta`'s doc comment). */
type CtaLinkType =
  'page' | 'course' | 'external' | 'whatsapp' | 'phone' | 'signUp' | 'signIn';

const LINK_TYPES: readonly {
  readonly type: CtaLinkType;
  readonly labelKey: string;
  readonly Icon: typeof FileText;
}[] = [
  { type: 'page', labelKey: 'website:fields.linkTypePage', Icon: FileText },
  {
    type: 'course',
    labelKey: 'website:fields.linkTypeCourse',
    Icon: GraduationCap,
  },
  {
    type: 'whatsapp',
    labelKey: 'website:fields.linkTypeWhatsapp',
    Icon: MessageCircle,
  },
  { type: 'phone', labelKey: 'website:fields.linkTypePhone', Icon: Phone },
  {
    type: 'external',
    labelKey: 'website:fields.linkTypeExternal',
    Icon: ExternalLink,
  },
  { type: 'signUp', labelKey: 'website:fields.linkTypeSignUp', Icon: UserPlus },
  { type: 'signIn', labelKey: 'website:fields.linkTypeSignIn', Icon: LogIn },
];

/**
 * Checked by KEY PRESENCE (`!== undefined`), never truthiness: choosing a
 * type sets its field to `''` (a course or number not picked yet is still
 * that type, just unfinished), and a truthy check would snap the choice
 * straight back to "page" before anything could be typed.
 */
function inferLinkType(value: Partial<WebsiteCta> | undefined): CtaLinkType {
  if (value?.authAction === 'signUp') return 'signUp';
  if (value?.authAction === 'signIn') return 'signIn';
  if (value?.courseId !== undefined) return 'course';
  if (value?.whatsapp !== undefined) return 'whatsapp';
  if (value?.phone !== undefined) return 'phone';
  if (value?.url !== undefined) return 'external';
  return 'page';
}

/** A button with only its label and look kept — the start of a new target. */
function retarget(
  value: Partial<WebsiteCta> | undefined,
  type: CtaLinkType
): Partial<WebsiteCta> {
  const base: Partial<WebsiteCta> = {
    label: value?.label ?? EMPTY_LOCALIZED_TEXT,
    ...(value?.style ? { style: value.style } : {}),
  };
  switch (type) {
    case 'course':
      return { ...base, courseId: '' };
    case 'external':
      return { ...base, url: '' };
    case 'whatsapp':
      return { ...base, whatsapp: '' };
    case 'phone':
      return { ...base, phone: '' };
    case 'signUp':
    case 'signIn':
      return { ...base, authAction: type };
    default:
      return base;
  }
}

/* ------------------------------------------------------------------ */
/* Phone numbers                                                         */
/* ------------------------------------------------------------------ */

const HOTLINE = /^\d{3,6}$/;

/**
 * What is stored for a typed number. A valid mobile number is stored
 * international (E.164). For a call button, a 3–6 digit hotline is kept as
 * typed and any other number of 7+ digits is put in international form with
 * the chosen country's code (a landline). Anything else is stored as typed,
 * so the schema refuses it and says how to fix it.
 */
export function storedButtonNumber(
  raw: string,
  country: CountryCode,
  kind: 'whatsapp' | 'phone'
): string {
  const text = toAsciiDigits(raw).trim();
  if (!text) return '';
  const check = checkPhone(text, country);
  if (check.ok) return check.e164;
  if (kind === 'whatsapp' || /[^\d\s\-().+]/.test(text)) return text;
  const digits = text.replace(/\D/g, '');
  if (!text.startsWith('+') && HOTLINE.test(digits)) return digits;
  if (text.startsWith('+')) return `+${digits}`;
  if (digits.replace(/^0+/, '').length < 7) return text;
  return `+${callingCodeOf(country)}${digits.replace(/^0+/, '')}`;
}

/** The country and the number as the field shows them for a stored value. */
function fieldStateFor(stored: string | undefined): {
  country: CountryCode;
  number: string;
} {
  const fallback = defaultPhoneCountry();
  if (!stored) return { country: fallback, number: '' };
  if (!stored.startsWith('+')) return { country: fallback, number: stored };
  const country = impliedCountry(stored, fallback) ?? fallback;
  const check = checkPhone(stored, country);
  return { country, number: check.ok ? check.national : stored };
}

function ButtonNumberField({
  id,
  kind,
  value,
  onChange,
  schemaError,
}: {
  readonly id: string;
  readonly kind: 'whatsapp' | 'phone';
  readonly value: string | undefined;
  readonly onChange: (next: string) => void;
  readonly schemaError?: string;
}): JSX.Element {
  const { t } = useTranslation();
  const [state, setState] = useState(() => fieldStateFor(value));
  const [touched, setTouched] = useState(false);
  // The latest typed state, read on blur — the input's own blur tidy-up
  // (national format, country switch) lands in the same tick.
  const stateRef = useRef(state);
  const committedRef = useRef(value);

  // Undo/redo or a reload replaces the value underneath: show it.
  useEffect(() => {
    if (value === committedRef.current) return;
    committedRef.current = value;
    const next = fieldStateFor(value);
    stateRef.current = next;
    setState(next);
  }, [value]);

  const commit = (next: string) => {
    if (next === committedRef.current) return;
    committedRef.current = next;
    onChange(next);
  };

  const update = (patch: Partial<typeof state>) => {
    const next = { ...stateRef.current, ...patch };
    stateRef.current = next;
    setState(next);
    // A complete number goes live at once; a half-typed one waits for blur.
    const check = checkPhone(next.number, next.country);
    if (check.ok) commit(check.e164);
    else if (!next.number.trim()) commit('');
  };

  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const mobileIssue =
    kind === 'whatsapp' &&
    state.number.trim() !== '' &&
    !checkPhone(state.number, state.country).ok
      ? t('validation:invalidWhatsappNumber')
      : undefined;
  const error = touched ? (schemaError ?? mobileIssue) : undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {t(
          kind === 'whatsapp'
            ? 'website:buttons.whatsappNumber'
            : 'website:buttons.callNumber'
        )}
      </Label>
      <PhoneNumberInput
        id={id}
        country={state.country}
        number={state.number}
        onCountryChange={(country) => update({ country })}
        onNumberChange={(number) => update({ number })}
        onBlur={() => {
          setTouched(true);
          const { number, country } = stateRef.current;
          commit(storedButtonNumber(number, country, kind));
        }}
        invalid={!!error}
        describedBy={error ? errorId : hintId}
      />
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : (
        <p id={hintId} className="text-xs text-muted-foreground">
          {t(
            kind === 'whatsapp'
              ? 'website:buttons.whatsappHint'
              : 'website:buttons.callHint'
          )}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Look                                                                  */
/* ------------------------------------------------------------------ */

const AUTO_STYLE = 'auto';

/** A small drawing of each look, beside its name. */
function StyleSample({
  look,
}: {
  readonly look: WebsiteCtaStyle | typeof AUTO_STYLE;
}): JSX.Element {
  if (look === 'primary')
    return <span aria-hidden className="h-3 w-7 rounded-sm bg-primary" />;
  if (look === 'secondary')
    return (
      <span
        aria-hidden
        className="h-3 w-7 rounded-sm border-2 border-foreground/60"
      />
    );
  if (look === 'link')
    return (
      <span
        aria-hidden
        className="text-xs font-semibold leading-3 underline underline-offset-2"
      >
        Aa
      </span>
    );
  return (
    <span aria-hidden className="flex h-3 items-center gap-0.5">
      <span className="h-3 w-3 rounded-sm bg-primary" />
      <span className="h-3 w-3 rounded-sm border-2 border-foreground/60" />
    </span>
  );
}

function ButtonStylePicker({
  id,
  value,
  onChange,
}: {
  readonly id: string;
  readonly value: WebsiteCtaStyle | undefined;
  readonly onChange: (next: WebsiteCtaStyle | undefined) => void;
}): JSX.Element {
  const { t } = useTranslation();
  const options = [AUTO_STYLE, ...CTA_STYLES] as const;
  return (
    <div className="space-y-1.5">
      <p id={id} className="text-sm font-medium leading-none">
        {t('website:buttons.style')}
      </p>
      <ToggleGroup
        type="single"
        aria-labelledby={id}
        value={value ?? AUTO_STYLE}
        // A single toggle group can be cleared by clicking the chosen item;
        // a button always has a look, so that click changes nothing.
        onValueChange={(next) => {
          if (!next) return;
          onChange(next === AUTO_STYLE ? undefined : (next as WebsiteCtaStyle));
        }}
        className="grid grid-cols-2 gap-2 sm:grid-cols-4"
      >
        {options.map((look) => (
          <ToggleGroupItem
            key={look}
            value={look}
            data-button-style={look}
            className="flex h-auto min-h-11 flex-col items-center justify-center gap-1.5 border border-border px-2 py-2 text-xs data-[state=on]:border-primary data-[state=on]:bg-primary/10 data-[state=on]:text-foreground"
          >
            <StyleSample look={look} />
            {t(`website:buttons.styles.${look}`)}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-xs text-muted-foreground">
        {t(
          value
            ? 'website:buttons.styleChosenHint'
            : 'website:buttons.styleAutoHint'
        )}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One button                                                            */
/* ------------------------------------------------------------------ */

function usePublishedCourses(academyId: string) {
  const { data } = useCourses(academyId, {
    query: {
      pagination: { page: 1, pageSize: 100 },
      filters: { status: 'published' },
    },
  });
  return data?.items ?? [];
}

/**
 * The editor for one section button. On its own (a FAQ's "all questions"
 * link, a spotlight's button) it draws its own frame and title; inside
 * `SectionButtonsEditor` (`inList`) the list's row is the frame, and the
 * look picker is offered.
 */
export function CtaFieldEditor({
  value,
  onChange,
  labelKey,
  path,
  errorFor,
  pages,
  academyId,
  inList = false,
}: {
  readonly value: Partial<WebsiteCta> | undefined;
  readonly onChange: (next: Partial<WebsiteCta> | undefined) => void;
  readonly labelKey: string;
  /** The button's key in the section config, e.g. `cta` or `secondaryCta`. */
  readonly path: string;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
  readonly inList?: boolean;
}): JSX.Element {
  const { t } = useTranslation();
  const fieldId = useId();
  const linkType = inferLinkType(value);
  const urlValue = value?.url ?? '';
  const urlError =
    (urlValue && !isSafeExternalUrl(urlValue)) ||
    Boolean(errorFor(`${path}.url`, labelKey));
  const courses = usePublishedCourses(academyId);
  const label = value?.label ?? EMPTY_LOCALIZED_TEXT;

  return (
    <div
      className={cn(
        'space-y-4',
        !inList && 'rounded-md border border-border p-3'
      )}
    >
      {inList ? null : (
        <p className="text-sm font-medium text-foreground">{t(labelKey)}</p>
      )}
      {/* Every section button shares one label limit (`websiteCtaSchema`). */}
      <LocalizedTextField
        id={`cta-label-${path}`}
        labelKey="website:fields.ctaLabelPlaceholder"
        value={value?.label as Partial<LocalizedText> | undefined}
        onChange={(next) => onChange({ ...value, label: next })}
        required
        maxLength={MAX_CTA_LABEL_LENGTH}
        errors={localizedErrors(
          errorFor,
          `${path}.label`,
          'website:fields.ctaLabelPlaceholder',
          MAX_CTA_LABEL_LENGTH
        )}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${fieldId}-type`}>
          {t('website:fields.linkType')}
        </Label>
        <Select
          value={linkType}
          onValueChange={(next) =>
            onChange(retarget(value, next as CtaLinkType))
          }
        >
          <SelectTrigger id={`${fieldId}-type`} data-testid="cta-link-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINK_TYPES.map(({ type, labelKey: typeLabel, Icon }) => (
              <SelectItem key={type} value={type}>
                <span className="flex items-center gap-2">
                  <Icon className="size-4 opacity-70" aria-hidden />
                  {t(typeLabel)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {linkType === 'page' ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-page`}>
            {t('website:fields.ctaTargetPlaceholder')}
          </Label>
          <Select
            value={value?.pageId}
            onValueChange={(pageId) =>
              onChange({ ...retarget(value, 'page'), pageId })
            }
          >
            <SelectTrigger id={`${fieldId}-page`}>
              <SelectValue placeholder={t('website:buttons.choosePage')} />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page) => (
                <SelectItem key={page.id} value={page.id}>
                  {page.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {linkType === 'course' ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-course`}>
            {t('website:fields.ctaCoursePlaceholder')}
          </Label>
          <Select
            value={value?.courseId || undefined}
            onValueChange={(courseId) =>
              onChange({ ...retarget(value, 'course'), courseId })
            }
          >
            <SelectTrigger id={`${fieldId}-course`}>
              <SelectValue placeholder={t('website:buttons.chooseCourse')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {linkType === 'external' ? (
        <div className="space-y-1.5">
          <Label htmlFor={`${fieldId}-url`}>
            {t('website:buttons.webAddress')}
          </Label>
          <Input
            id={`${fieldId}-url`}
            type="url"
            inputMode="url"
            dir="ltr"
            data-ltr-content
            placeholder="https://example.com"
            aria-invalid={urlError || undefined}
            aria-describedby={urlError ? `${fieldId}-url-error` : undefined}
            data-field-error={urlError || undefined}
            value={urlValue}
            onChange={(event) =>
              onChange({
                ...retarget(value, 'external'),
                url: event.target.value,
              })
            }
          />
          {urlError ? (
            <p id={`${fieldId}-url-error`} className="text-xs text-destructive">
              {t('validation:invalidUrl')}
            </p>
          ) : null}
        </div>
      ) : null}

      {linkType === 'whatsapp' ? (
        <>
          <ButtonNumberField
            id={`${fieldId}-whatsapp`}
            kind="whatsapp"
            value={value?.whatsapp}
            onChange={(whatsapp) => onChange({ ...value, label, whatsapp })}
            schemaError={errorFor(`${path}.whatsapp`, labelKey)}
          />
          <LocalizedTextField
            id={`cta-whatsapp-message-${path}`}
            labelKey="website:buttons.whatsappMessage"
            value={value?.whatsappMessage as Partial<LocalizedText> | undefined}
            onChange={(whatsappMessage) =>
              onChange({ ...value, label, whatsappMessage })
            }
            multiline
            maxLength={MAX_CTA_WHATSAPP_MESSAGE_LENGTH}
            errors={localizedErrors(
              errorFor,
              `${path}.whatsappMessage`,
              'website:buttons.whatsappMessage',
              MAX_CTA_WHATSAPP_MESSAGE_LENGTH
            )}
          />
        </>
      ) : null}

      {linkType === 'phone' ? (
        <ButtonNumberField
          id={`${fieldId}-phone`}
          kind="phone"
          value={value?.phone}
          onChange={(phone) => onChange({ ...value, label, phone })}
          schemaError={errorFor(`${path}.phone`, labelKey)}
        />
      ) : null}

      {linkType === 'signUp' || linkType === 'signIn' ? (
        <p className="text-xs text-muted-foreground">
          {t(
            linkType === 'signUp'
              ? 'website:buttons.signUpHint'
              : 'website:buttons.signInHint'
          )}
        </p>
      ) : null}

      {inList ? (
        <ButtonStylePicker
          id={`${fieldId}-style`}
          value={value?.style}
          onChange={(style) => {
            const next = { ...value, label };
            if (style) next.style = style;
            else delete next.style;
            onChange(next);
          }}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The list                                                              */
/* ------------------------------------------------------------------ */

/** Where a button goes, in a few words, for its collapsed row; `null` when it goes nowhere yet. */
function useDestination(
  academyId: string,
  pages: readonly WebsitePage[]
): (cta: Partial<WebsiteCta>) => {
  readonly Icon: typeof FileText;
  readonly text: string;
} | null {
  const { t } = useTranslation();
  const courses = usePublishedCourses(academyId);
  return (cta) => {
    const type = inferLinkType(cta);
    const Icon = LINK_TYPES.find((entry) => entry.type === type)!.Icon;
    switch (type) {
      case 'signUp':
      case 'signIn':
        return {
          Icon,
          text: t(
            type === 'signUp'
              ? 'website:fields.linkTypeSignUp'
              : 'website:fields.linkTypeSignIn'
          ),
        };
      case 'page': {
        const page = pages.find((candidate) => candidate.id === cta.pageId);
        return page && resolvePagePath(page) !== undefined
          ? { Icon, text: page.title }
          : null;
      }
      case 'course': {
        const course = courses.find(
          (candidate) => candidate.id === cta.courseId
        );
        return cta.courseId
          ? { Icon, text: course?.title ?? t('website:fields.linkTypeCourse') }
          : null;
      }
      case 'whatsapp':
        return cta.whatsapp
          ? { Icon, text: formatInternational(cta.whatsapp) }
          : null;
      case 'phone':
        return cta.phone
          ? {
              Icon,
              text: cta.phone.startsWith('+')
                ? formatInternational(cta.phone)
                : cta.phone,
            }
          : null;
      default:
        if (!cta.url || !isSafeExternalUrl(cta.url)) return null;
        try {
          return { Icon, text: new URL(cta.url).host || cta.url };
        } catch {
          return null;
        }
    }
  };
}

/** The paths under one button that can carry a problem. */
const BUTTON_ISSUE_PATHS = [
  'label.en',
  'label.ar',
  'url',
  'whatsapp',
  'phone',
  'whatsappMessage.en',
  'whatsappMessage.ar',
] as const;

export function SectionButtonsEditor({
  value,
  onChange,
  labelKey,
  minButtons = 0,
  errorFor,
  pages,
  academyId,
}: {
  /** The section config (only its button slots are read). */
  readonly value: SectionButtons;
  /** The new contents of all three slots (`undefined` = no button). */
  readonly onChange: (
    next: Record<SectionButtonSlot, WebsiteCta | undefined>
  ) => void;
  readonly labelKey: string;
  /** A CTA band needs its first button. */
  readonly minButtons?: number;
  readonly errorFor: FieldErrorLookup;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const headingId = useId();
  const buttons = SECTION_BUTTON_SLOTS.map((slot) => value[slot]).filter(
    (cta): cta is WebsiteCta => !!cta
  );
  const [open, setOpen] = useState<number | null>(() =>
    buttons.length === 1 ? 0 : null
  );
  const destination = useDestination(academyId, pages);
  const max = SECTION_BUTTON_SLOTS.length;
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const issueAt = (index: number) =>
    BUTTON_ISSUE_PATHS.some(
      (path) => !!errorFor(`${SECTION_BUTTON_SLOTS[index]}.${path}`, labelKey)
    );
  // A problem inside a closed button opens it, so the field to fix is on
  // screen (and the form's "go to the first problem" can reach it).
  const firstIssue = buttons.findIndex((_, index) => issueAt(index));
  useEffect(() => {
    if (firstIssue !== -1) setOpen(firstIssue);
  }, [firstIssue]);

  const write = (next: readonly (WebsiteCta | undefined)[]) => {
    const compact = next.filter((cta): cta is WebsiteCta => !!cta);
    onChange({
      cta: compact[0],
      secondaryCta: compact[1],
      tertiaryCta: compact[2],
    });
  };

  const add = () => {
    if (buttons.length >= max) return;
    write([...buttons, { label: EMPTY_LOCALIZED_TEXT }]);
    setOpen(buttons.length);
  };

  const remove = (index: number) => {
    write(buttons.filter((_, position) => position !== index));
    setOpen(null);
  };

  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= buttons.length) return;
    const next = [...buttons];
    [next[index], next[target]] = [next[target]!, next[index]!];
    write(next);
    if (open === index) setOpen(target);
    else if (open === target) setOpen(index);
  };

  return (
    <section
      aria-labelledby={headingId}
      className="space-y-3 rounded-md border border-border p-3"
      data-testid="section-buttons"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={headingId} className="text-sm font-medium text-foreground">
          {t(labelKey)}
        </h3>
        <p className="text-xs tabular-nums text-muted-foreground">
          {t('website:buttons.count', { count: buttons.length, max })}
        </p>
      </div>

      {buttons.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {t('website:buttons.empty')}
        </p>
      ) : null}

      <ol className="space-y-2">
        {buttons.map((cta, index) => {
          const slot = SECTION_BUTTON_SLOTS[index]!;
          const isOpen = open === index;
          const regionId = `${headingId}-button-${index}`;
          const title =
            resolveLocalizedText(cta.label, locale).trim() ||
            t('website:buttons.untitled', { number: index + 1 });
          const goesTo = destination(cta);
          const hasIssue = issueAt(index);
          const canRemove = buttons.length > minButtons;
          return (
            <li
              key={slot}
              data-button-slot={slot}
              className={cn(
                'rounded-md border bg-card',
                hasIssue ? 'border-destructive/60' : 'border-border'
              )}
            >
              <div className="flex items-center gap-1 p-1">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={regionId}
                  onClick={() => setOpen(isOpen ? null : index)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-md px-2 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
                      isOpen && 'rotate-180'
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {title}
                    </span>
                    {hasIssue ? (
                      <span className="flex items-center gap-1 text-xs text-destructive">
                        <AlertCircle
                          aria-hidden
                          className="size-3.5 shrink-0"
                        />
                        {t('website:buttons.needsAttention')}
                      </span>
                    ) : goesTo ? (
                      <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
                        <goesTo.Icon
                          aria-hidden
                          className="size-3.5 shrink-0"
                        />
                        <span className="truncate" dir="auto">
                          {goesTo.text}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
                        <AlertCircle
                          aria-hidden
                          className="size-3.5 shrink-0"
                        />
                        {t('website:buttons.noDestination')}
                      </span>
                    )}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t('website:buttons.moveUp', { name: title })}
                >
                  <ArrowUp className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0"
                  disabled={index === buttons.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t('website:buttons.moveDown', { name: title })}
                >
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                  disabled={!canRemove}
                  onClick={() => remove(index)}
                  aria-label={t('website:buttons.remove', { name: title })}
                >
                  <Trash2 className="size-4" aria-hidden />
                </Button>
              </div>
              {isOpen ? (
                <div id={regionId} className="border-t border-border p-3">
                  <CtaFieldEditor
                    inList
                    labelKey={labelKey}
                    path={slot}
                    errorFor={errorFor}
                    pages={pages}
                    academyId={academyId}
                    value={cta}
                    onChange={(next) => {
                      const updated = [...buttons];
                      updated[index] = {
                        ...(next ?? {}),
                        label: next?.label ?? EMPTY_LOCALIZED_TEXT,
                      } as WebsiteCta;
                      write(updated);
                    }}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {minButtons > 0 && buttons.length <= minButtons ? (
        <p className="text-xs text-muted-foreground">
          {t('website:buttons.minimum', { count: minButtons })}
        </p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full border-dashed"
        onClick={add}
        disabled={buttons.length >= max}
        data-testid="section-buttons-add"
      >
        <Plus className="size-4" aria-hidden />
        {buttons.length >= max
          ? t('website:buttons.full', { max })
          : t('website:buttons.add')}
      </Button>
    </section>
  );
}
