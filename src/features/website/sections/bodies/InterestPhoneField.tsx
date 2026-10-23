/**
 * CMS phase 3d (batch C) — the interest form's phone control.
 *
 * It is the shared phone input (`PhoneNumberInput`: a searchable country
 * picker, Egypt first, plus the number, tidied to its national format on
 * blur) — but that control brings `libphonenumber-js` and the country list
 * with it, and nothing new may load on a public page until it is needed. So
 * the page (and the server render) carry a look-alike: the same box, the
 * "+20" calling code and a plain `type="tel"` input that already works.
 * The real control is fetched when the form comes within a screen of the
 * viewport, or the moment the visitor touches it, and replaces the
 * look-alike in the same box — the typed number and the focus carry over,
 * and nothing on the page moves.
 */
import {
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type RefObject,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@utils';
import type { PhoneNumberInputProps } from '@/shared/components/phone/PhoneNumberInput';
import type { PhoneVerdict } from './interest-form.logic';

/** Egypt — the product's primary market (`FALLBACK_PHONE_COUNTRY`), kept here so the page needs no phone code to show it. */
export const INTEREST_DEFAULT_PHONE_COUNTRY = 'EG';
const DEFAULT_CALLING_CODE = '20';
/** Mirrors `PHONE_INPUT_MAX_LENGTH`. */
const PHONE_MAX_LENGTH = 32;

export interface InterestPhoneModule {
  readonly PhoneNumberInput: ComponentType<
    PhoneNumberInputProps & { ref?: React.Ref<HTMLInputElement> }
  >;
  readonly checkPhone: (number: string, country: string) => PhoneVerdict;
}

let modulePromise: Promise<InterestPhoneModule> | undefined;

/** Fetches the phone control once per page; a failed fetch can be retried. */
export function loadInterestPhone(): Promise<InterestPhoneModule> {
  modulePromise ??= import('./interest-phone').then(
    (module) => module as unknown as InterestPhoneModule,
    (error: unknown) => {
      modulePromise = undefined;
      throw error;
    }
  );
  return modulePromise;
}

/**
 * The phone control's code, once the form (`rootRef`) is within a screen of
 * the viewport or has been focused or pointed at. Where the browser cannot
 * observe (tests, very old browsers) it loads at once.
 */
export function useInterestPhoneModule(
  rootRef: RefObject<HTMLElement>
): InterestPhoneModule | undefined {
  const [phone, setPhone] = useState<InterestPhoneModule>();
  useEffect(() => {
    let active = true;
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      loadInterestPhone().then(
        (module) => {
          if (active) setPhone(module);
        },
        () => {
          // The look-alike keeps working; the server checks the number.
          started = false;
        }
      );
    };
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      load();
      return () => {
        active = false;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: '100% 0px' }
    );
    observer.observe(root);
    root.addEventListener('focusin', load);
    root.addEventListener('pointerenter', load);
    return () => {
      active = false;
      observer.disconnect();
      root.removeEventListener('focusin', load);
      root.removeEventListener('pointerenter', load);
    };
  }, [rootRef]);
  return phone;
}

const TRIGGER_BASE =
  'flex h-10 shrink-0 items-center gap-1.5 rounded-l-md border border-r-0 border-input bg-background px-2.5 text-sm';
const INPUT_BASE =
  'flex h-10 w-full min-w-0 rounded-r-md border border-input bg-background px-3 py-2 text-base tabular-nums md:text-sm';

export function InterestPhoneField({
  phone,
  id,
  number,
  country,
  onNumberChange,
  onCountryChange,
  onBlur,
  invalid,
  describedBy,
  triggerClassName,
  inputClassName,
  wrapperClassName,
  inputRef,
}: {
  readonly phone: InterestPhoneModule | undefined;
  readonly id: string;
  readonly number: string;
  readonly country: string;
  readonly onNumberChange: (number: string) => void;
  readonly onCountryChange: (country: string) => void;
  readonly onBlur: () => void;
  readonly invalid: boolean;
  readonly describedBy?: string;
  readonly triggerClassName?: string;
  readonly inputClassName?: string;
  /** The control's outer box (a theme drops the shadow its inputs don't have). */
  readonly wrapperClassName?: string;
  /** The number input, whichever is on screen (the form focuses it on an error). */
  readonly inputRef: RefObject<HTMLInputElement>;
}): JSX.Element {
  // Read while the look-alike is still in the page: had it the focus when
  // the real control arrived? Then the real one takes it over.
  const swapped = useRef(false);
  const refocus = useRef(false);
  if (phone && !swapped.current) {
    swapped.current = true;
    refocus.current =
      typeof document !== 'undefined' &&
      !!inputRef.current &&
      document.activeElement === inputRef.current;
  }
  useEffect(() => {
    if (phone && refocus.current) {
      refocus.current = false;
      inputRef.current?.focus();
    }
  }, [phone, inputRef]);

  if (phone) {
    const { PhoneNumberInput } = phone;
    return (
      <PhoneNumberInput
        ref={inputRef}
        id={id}
        country={country as PhoneNumberInputProps['country']}
        number={number}
        onCountryChange={onCountryChange}
        onNumberChange={onNumberChange}
        onBlur={onBlur}
        invalid={invalid}
        describedBy={describedBy}
        triggerClassName={triggerClassName}
        inputClassName={inputClassName}
        className={wrapperClassName}
      />
    );
  }

  return (
    <div
      dir="ltr"
      data-ltr-content
      data-phone-placeholder=""
      className={cn(
        'flex w-full items-stretch rounded-md shadow-sm',
        wrapperClassName
      )}
    >
      <span aria-hidden className={cn(TRIGGER_BASE, triggerClassName)}>
        <span className="inline-block h-4 w-6 shrink-0 rounded-[2px] bg-muted" />
        <span className="tabular-nums">{`+${DEFAULT_CALLING_CODE}`}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </span>
      <input
        ref={inputRef}
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        dir="ltr"
        maxLength={PHONE_MAX_LENGTH}
        value={number}
        onChange={(event) => onNumberChange(event.target.value)}
        onBlur={onBlur}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn(
          INPUT_BASE,
          invalid && 'border-destructive',
          inputClassName
        )}
      />
    </div>
  );
}
