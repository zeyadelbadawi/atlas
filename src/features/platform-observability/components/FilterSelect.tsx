/** A labelled filter dropdown for the Observability filter rows. */
import { useId } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface FilterSelectProps {
  readonly label: string;
  readonly value: string;
  readonly options: readonly {
    readonly value: string;
    readonly label: string;
  }[];
  readonly onChange: (next: string) => void;
}

export function FilterSelect({
  label,
  value,
  options,
  onChange,
}: FilterSelectProps): JSX.Element {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id} className="w-full sm:w-40" aria-label={label}>
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
