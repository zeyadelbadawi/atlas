/**
 * A stored phone number for reading: `+20 100 123 4567`, always
 * left-to-right (also inside Arabic text) and rendered as plain text — React
 * escapes it, and the value is server-normalised E.164 anyway.
 */
import { cn } from '@/lib/utils';
import { CountryFlag } from './CountryFlag';
import { formatInternational } from './phone-number';

export interface PhoneNumberDisplayProps {
  readonly e164: string;
  readonly country: string;
  readonly className?: string;
}

export function PhoneNumberDisplay({
  e164,
  country,
  className,
}: PhoneNumberDisplayProps): JSX.Element {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <CountryFlag country={country} />
      <span
        dir="ltr"
        data-ltr-content
        className="tabular-nums"
        data-testid="phone-number-display"
      >
        {formatInternational(e164)}
      </span>
    </span>
  );
}
