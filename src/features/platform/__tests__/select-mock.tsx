/**
 * A native <select> stand-in for the Radix Select (jsdom cannot drive the
 * Radix popover): the trigger's aria-label names the select (and its
 * data-testid tags it), items become options. Used with `vi.mock('@/components/ui/select', () => import(...))`.
 */
import React from 'react';

type AnyProps = Record<string, unknown> & {
  readonly children?: React.ReactNode;
};

function triggerProp(
  children: React.ReactNode,
  name: string
): string | undefined {
  let found: string | undefined;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const value = (child.props as Record<string, unknown>)[name];
    if (typeof value === 'string') found = value;
  });
  return found;
}

export const Select = ({ value, onValueChange, children }: AnyProps) =>
  React.createElement(
    'select',
    {
      'aria-label': triggerProp(children, 'aria-label'),
      'data-testid': triggerProp(children, 'data-testid'),
      value: value as string,
      onChange: (event: React.ChangeEvent<HTMLSelectElement>) =>
        (onValueChange as (next: string) => void)(event.target.value),
    },
    children
  );
export const SelectTrigger = () => null;
export const SelectValue = () => null;
export const SelectContent = ({ children }: AnyProps) =>
  React.createElement(React.Fragment, null, children);
export const SelectItem = ({ value, children }: AnyProps) =>
  React.createElement('option', { value: value as string }, children);
