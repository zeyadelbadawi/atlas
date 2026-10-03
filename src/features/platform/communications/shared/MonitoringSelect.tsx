/**
 * A labelled single-choice filter for the Email & Notifications consoles.
 * The visible label is a real `<Label>` bound to the trigger, so the
 * control is named for screen readers and the label is never only a
 * placeholder.
 */
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface MonitoringSelectOption {
  readonly value: string;
  readonly label: string;
}

export interface MonitoringSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly MonitoringSelectOption[];
  readonly onChange: (value: string) => void;
  readonly className?: string;
}

export function MonitoringSelect({
  label,
  value,
  options,
  onChange,
  className,
}: MonitoringSelectProps): JSX.Element {
  const id = useId();
  return (
    <div className={className ?? 'min-w-0 space-y-1.5'}>
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} aria-label={label} className="h-10 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
