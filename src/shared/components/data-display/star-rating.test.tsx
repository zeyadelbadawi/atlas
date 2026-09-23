/**
 * StarRating — the two contracts that matter for accessibility:
 *
 *   - readonly mode exposes the score as a single labelled image, never as
 *     five unlabelled glyphs (colour alone must not carry the value);
 *   - interactive mode is a real radiogroup whose stars are radios, one in
 *     the tab order, and clicking one reports its value.
 *
 * jsdom has no layout, so the visual fill fraction is not asserted here —
 * the accessible structure is.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StarRating } from './StarRating';

afterEach(cleanup);

describe('StarRating', () => {
  it('readonly: exposes the value as one labelled image, no radios', () => {
    render(<StarRating value={3.5} label="Rated 3.5 out of 5" />);
    // getByRole throws if absent, so a successful lookup is the presence assertion.
    expect(
      screen.getByRole('img', { name: 'Rated 3.5 out of 5' })
    ).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
  });

  it('readonly: falls back to a default label when none is given', () => {
    render(<StarRating value={4} />);
    expect(screen.getByRole('img', { name: '4 out of 5' })).toBeTruthy();
  });

  it('interactive: renders a radiogroup of five radios', () => {
    render(<StarRating value={0} onChange={() => {}} label="Your rating" />);
    expect(
      screen.getByRole('radiogroup', { name: 'Your rating' })
    ).toBeTruthy();
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('interactive: clicking a star reports that value', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StarRating value={0} onChange={onChange} label="Your rating" />);
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('interactive: marks the current value as the checked radio', () => {
    render(<StarRating value={2} onChange={() => {}} label="Your rating" />);
    const checked = screen.getByRole('radio', { checked: true });
    expect(checked.getAttribute('aria-label')).toBe('2 stars');
  });
});
