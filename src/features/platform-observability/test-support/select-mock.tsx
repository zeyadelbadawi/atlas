/**
 * Test double for `@/components/ui/select`: a native <select> that keeps the
 * trigger's id and accessible name, so tests can pick an option with
 * `fireEvent.change` (Radix's pointer-driven listbox does not run in jsdom).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

interface Meta {
  readonly id?: string;
  readonly label?: string;
}

const Register = createContext<(meta: Meta) => void>(() => undefined);

export function Select({
  value,
  onValueChange,
  children,
}: {
  readonly value?: string;
  readonly onValueChange?: (value: string) => void;
  readonly children: ReactNode;
}): JSX.Element {
  const [meta, setMeta] = useState<Meta>({});
  const register = useCallback(
    (next: Meta) =>
      setMeta((previous) =>
        previous.id === next.id && previous.label === next.label
          ? previous
          : next
      ),
    []
  );
  return (
    <Register.Provider value={register}>
      <select
        id={meta.id}
        aria-label={meta.label}
        value={value}
        onChange={(event) => onValueChange?.(event.target.value)}
      >
        {children}
      </select>
    </Register.Provider>
  );
}

export function SelectTrigger({
  id,
  'aria-label': label,
}: {
  readonly id?: string;
  readonly 'aria-label'?: string;
  readonly children?: ReactNode;
  readonly className?: string;
}): null {
  const register = useContext(Register);
  useEffect(() => register({ id, label }), [register, id, label]);
  return null;
}

export const SelectValue = (): null => null;

export function SelectContent({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  return <>{children}</>;
}

export function SelectItem({
  value,
  children,
}: {
  readonly value: string;
  readonly children: ReactNode;
}): JSX.Element {
  return <option value={value}>{children}</option>;
}
