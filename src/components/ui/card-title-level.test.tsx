/**
 * `CardTitle`'s heading level is an accessibility contract, not styling.
 *
 * Screen-reader users navigate by heading structure, so a card that is a
 * page's top-level section must not announce `h3` under an `h1`, and a
 * card that contains `h3` subsections must outrank them. The level is
 * opt-in precisely because a primitive cannot know where it sits: 77
 * files use this, and cards nested inside an `h2` section are correct at
 * the `h3` default.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CardTitle } from './card';

afterEach(cleanup);

describe('CardTitle', () => {
  it('still renders h3 when no level is given, so existing call sites are unchanged', () => {
    render(<CardTitle>Untouched</CardTitle>);
    expect(screen.getByText('Untouched').tagName).toBe('H3');
  });

  it('renders the requested level', () => {
    render(<CardTitle as="h2">Section</CardTitle>);
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('Section');
  });

  it('keeps its styling when the level changes', () => {
    render(
      <>
        <CardTitle>Default</CardTitle>
        <CardTitle as="h2">Raised</CardTitle>
      </>
    );
    expect(screen.getByText('Default').className).toBe(
      screen.getByText('Raised').className
    );
  });

  it('still forwards className and other heading attributes', () => {
    render(
      <CardTitle as="h2" className="extra" id="card-heading">
        Labelled
      </CardTitle>
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.id).toBe('card-heading');
    expect(heading.className).toContain('extra');
  });
});
