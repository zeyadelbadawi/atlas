/**
 * Phone numbers on the client — the same rule the backend enforces
 * (`atlas-backend/src/identity/phone/phone-number.policy.ts`,
 * docs/USER_PHONE.md), used for instant feedback only. The server
 * re-validates and normalises everything itself; what is sent is the text as
 * typed plus the chosen country.
 *
 * `libphonenumber-js/mobile` metadata: `isValid()` is true only for numbers
 * that can be a mobile number (the backend's "mobile or fixed-line-or-mobile"
 * policy), at ~24 KB gzip instead of ~40 KB for the full set. A landline is
 * therefore "not a valid mobile number" here; the backend tells the two apart.
 */
import {
  AsYouType,
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberWithError,
  type CountryCode,
} from 'libphonenumber-js/mobile';

/** Mirrors the backend's `PHONE_INPUT_MAX_LENGTH`. */
export const PHONE_INPUT_MAX_LENGTH = 32;

/**
 * Egypt is the product's primary market and the fallback when the browser
 * gives no better hint (docs/USER_PHONE.md).
 */
export const FALLBACK_PHONE_COUNTRY: CountryCode = 'EG';

const ALLOWED_CHARACTERS = /^\+?[0-9\s\-().]+$/;

export type PhoneIssue =
  | 'required'
  /** Not a valid mobile number for the chosen country. */
  | 'invalid'
  /** A valid number of another country than the one chosen. */
  | 'countryMismatch'
  | 'invalidCountry';

export type PhoneCheck =
  | {
      readonly ok: true;
      readonly e164: string;
      readonly country: CountryCode;
      /** e.g. `0100 123 4567` — what the field shows once the number is complete. */
      readonly national: string;
    }
  | {
      readonly ok: false;
      readonly issue: PhoneIssue;
      /** For `countryMismatch`: the country the number actually belongs to. */
      readonly numberCountry?: CountryCode;
    };

const SUPPORTED = new Set<string>(getCountries());

export function isPhoneCountry(value: unknown): value is CountryCode {
  return typeof value === 'string' && SUPPORTED.has(value);
}

/** Arabic-Indic and Extended Arabic-Indic digits → ASCII (people in Arabic locales type them). */
export function toAsciiDigits(value: string): string {
  return value.replace(/[٠-٩۰-۹]/g, (digit) => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

export function callingCodeOf(country: CountryCode): string {
  return getCountryCallingCode(country);
}

export function checkPhone(rawNumber: string, rawCountry: string): PhoneCheck {
  const text = toAsciiDigits(rawNumber ?? '').trim();
  if (text === '') return { ok: false, issue: 'required' };
  if (!isPhoneCountry(rawCountry))
    return { ok: false, issue: 'invalidCountry' };
  if (
    text.length > PHONE_INPUT_MAX_LENGTH ||
    !ALLOWED_CHARACTERS.test(text) ||
    text.replace(/\D/g, '').length < 4
  ) {
    return { ok: false, issue: 'invalid' };
  }
  try {
    const parsed = parsePhoneNumberWithError(text, {
      defaultCountry: rawCountry,
    });
    if (!parsed.isValid()) return { ok: false, issue: 'invalid' };
    if (parsed.country && parsed.country !== rawCountry) {
      return {
        ok: false,
        issue: 'countryMismatch',
        numberCountry: parsed.country,
      };
    }
    return {
      ok: true,
      e164: parsed.number,
      country: rawCountry,
      national: parsed.formatNational(),
    };
  } catch {
    return { ok: false, issue: 'invalid' };
  }
}

/**
 * The country a typed number unambiguously names, when it differs from the
 * chosen one — an international number (`+966…`, pasted or autofilled) or a
 * valid number of another country that shares the calling code (+1 US/CA).
 * The field switches its selector to it rather than showing an error.
 */
export function impliedCountry(
  rawNumber: string,
  current: CountryCode
): CountryCode | null {
  const text = toAsciiDigits(rawNumber ?? '').trim();
  if (!ALLOWED_CHARACTERS.test(text)) return null;
  if (text.startsWith('+')) {
    const typing = new AsYouType();
    typing.input(text);
    const country = typing.getCountry();
    return country && country !== current ? country : null;
  }
  const check = checkPhone(text, current);
  if (
    !check.ok &&
    check.issue === 'countryMismatch' &&
    check.numberCountry &&
    callingCodeOf(check.numberCountry) === callingCodeOf(current)
  ) {
    return check.numberCountry;
  }
  return null;
}

/** `+20 100 123 4567` for display; the stored value is shown as-is if it does not parse. */
export function formatInternational(e164: string): string {
  try {
    return parsePhoneNumberWithError(e164).formatInternational();
  } catch {
    return e164;
  }
}

/**
 * Browser time zone → country, for the markets Atlas serves. The time zone
 * reflects where the device is; the UI language does not (`en-US` is the
 * default for many people who are not in the US), so the language region is
 * deliberately not used.
 */
const TIME_ZONE_COUNTRIES: Readonly<Record<string, CountryCode>> = {
  'Africa/Cairo': 'EG',
  'Asia/Riyadh': 'SA',
  'Asia/Dubai': 'AE',
  'Asia/Kuwait': 'KW',
  'Asia/Qatar': 'QA',
  'Asia/Bahrain': 'BH',
  'Asia/Muscat': 'OM',
  'Asia/Amman': 'JO',
  'Asia/Beirut': 'LB',
  'Asia/Baghdad': 'IQ',
  'Asia/Damascus': 'SY',
  'Asia/Gaza': 'PS',
  'Asia/Hebron': 'PS',
  'Asia/Aden': 'YE',
  'Africa/Khartoum': 'SD',
  'Africa/Tripoli': 'LY',
  'Africa/Tunis': 'TN',
  'Africa/Algiers': 'DZ',
  'Africa/Casablanca': 'MA',
  'Africa/Nouakchott': 'MR',
  'Europe/Istanbul': 'TR',
  'Europe/London': 'GB',
  'Europe/Berlin': 'DE',
  'Europe/Paris': 'FR',
  'Europe/Amsterdam': 'NL',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Denver': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'America/Vancouver': 'CA',
};

export function defaultPhoneCountry(timeZone?: string): CountryCode {
  let zone = timeZone;
  if (zone === undefined) {
    try {
      zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      zone = undefined;
    }
  }
  return (zone && TIME_ZONE_COUNTRIES[zone]) || FALLBACK_PHONE_COUNTRY;
}

export interface PhoneCountryOption {
  readonly code: CountryCode;
  readonly callingCode: string;
  /** In the interface language. */
  readonly name: string;
  /** Lower-cased, diacritic-free names in the interface language and English, code and calling code. */
  readonly searchText: string;
}

/** Folds case, Latin diacritics and Arabic letter variants so "مصر"/"Egypt"/"egy"/"+20" all match. */
export function foldForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ًͯ-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .toLowerCase()
    .trim();
}

function displayNames(language: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([language], { type: 'region' });
  } catch {
    return null;
  }
}

/** Every country libphonenumber knows, named and sorted in the interface language. */
export function phoneCountryOptions(language: string): PhoneCountryOption[] {
  const local = displayNames(language);
  const english = language.startsWith('en') ? local : displayNames('en');
  const collator = new Intl.Collator(language);
  return getCountries()
    .map((code) => {
      const name = local?.of(code) ?? code;
      const englishName = english?.of(code) ?? code;
      const callingCode = getCountryCallingCode(code);
      return {
        code,
        callingCode,
        name,
        searchText: foldForSearch(
          `${name} ${englishName} ${code} +${callingCode} ${callingCode}`
        ),
      };
    })
    .sort((a, b) => collator.compare(a.name, b.name));
}

export type { CountryCode };
