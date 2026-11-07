/**
 * SEO/AEO/GEO pass — FAQ answers are in the page from the start (hidden
 * until opened), so the server-rendered HTML carries them.
 */
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { FaqDisclosureList } from './FaqDisclosureList';

const items = [
  { id: 'a', question: 'Is it online?', answer: 'Yes, fully online.' },
  { id: 'b', question: 'Can I pay later?', answer: 'No, at enrolment.' },
];

describe('FaqDisclosureList', () => {
  it('server-renders every answer, hidden, in a region named by its question', () => {
    const html = renderToString(<FaqDisclosureList items={items} />);
    expect(html).toContain('Yes, fully online.');
    expect(html).toContain('No, at enrolment.');
    expect(html.match(/role="region"/g)).toHaveLength(2);
    expect(html.match(/hidden=""/g)).toHaveLength(2);
    expect(html.match(/<h3/g)).toHaveLength(2);
  });

  it('opens one answer at a time and closes it again', () => {
    render(<FaqDisclosureList items={items} />);
    const first = screen.getByRole('button', { name: 'Is it online?' });
    const second = screen.getByRole('button', { name: 'Can I pay later?' });
    const panel = (text: string) =>
      screen.getByText(text).closest('[role="region"]') as HTMLElement;
    expect(panel('Yes, fully online.').hidden).toBe(true);
    fireEvent.click(first);
    expect(first.getAttribute('aria-expanded')).toBe('true');
    expect(panel('Yes, fully online.').hidden).toBe(false);
    fireEvent.click(second);
    expect(first.getAttribute('aria-expanded')).toBe('false');
    expect(panel('Yes, fully online.').hidden).toBe(true);
    expect(panel('No, at enrolment.').hidden).toBe(false);
    fireEvent.click(second);
    expect(panel('No, at enrolment.').hidden).toBe(true);
    expect(second.getAttribute('aria-controls')).toBe(
      panel('No, at enrolment.').id
    );
    expect(panel('No, at enrolment.').getAttribute('aria-labelledby')).toBe(
      second.id
    );
  });
});
