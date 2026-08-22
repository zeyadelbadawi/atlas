/**
 * Website Color Field.
 *
 * A native `<input type="color">` bound to an HSL-triplet form value, with
 * a live WCAG contrast check against white text (the color's most common
 * use — CTA buttons, the header CTA) — see `Reports/ARCHITECTURE.md`,
 * Prompt 9, "Color Validation". Never silently replaces the client's
 * chosen color; only warns.
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { hasAccessibleContrast, hexToHslTriplet, hslTripletToHex } from '../utils/color.utils';
import type { HslColorTriplet } from '@types';

const WHITE_HSL: HslColorTriplet = '0 0% 100%';

export interface WebsiteColorFieldProps {
  readonly id: string;
  readonly labelKey: string;
  readonly value: HslColorTriplet;
  readonly onChange: (value: HslColorTriplet) => void;
}

export function WebsiteColorField({
  id,
  labelKey,
  value,
  onChange,
}: WebsiteColorFieldProps): JSX.Element {
  const { t } = useTranslation();
  const isAccessibleOnWhiteText = hasAccessibleContrast(value, WHITE_HSL);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t(labelKey)}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={hslTripletToHex(value)}
          onChange={(event) => onChange(hexToHslTriplet(event.target.value))}
          className="size-10 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
          aria-label={t(labelKey)}
        />
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      </div>
      {!isAccessibleOnWhiteText ? (
        <p className="flex items-center gap-1.5 text-xs text-warning">
          <AlertTriangle className="size-3.5 shrink-0" aria-hidden />
          {t('website:brand.contrastWarning')}
        </p>
      ) : null}
    </div>
  );
}
