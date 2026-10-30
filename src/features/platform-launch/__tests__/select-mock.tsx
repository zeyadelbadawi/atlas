/**
 * A native <select> stand-in for the Radix Select (jsdom cannot drive the
 * Radix popover): the trigger's aria-label names the select, items become
 * options. Used with `vi.mock('@/components/ui/select', () => import(...))`.
 */
import React from 'react';

type AnyProps = Record<string, unknown> & {
  readonly children?: React.ReactNode;
};

function labelOf(children: React.ReactNode): string | undefined {
  let label: string | undefined;
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    const value = (child.props as Record<string, unknown>)['aria-label'];
    if (typeof value === 'string') label = value;
  });
  return label;
}

export const Select = ({ value, onValueChange, children }: AnyProps) =>
  React.createElement(
    'select',
    {
      'aria-label': labelOf(children),
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
