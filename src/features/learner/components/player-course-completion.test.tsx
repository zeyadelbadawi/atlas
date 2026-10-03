/**
 * The end of a course, which used to be a greyed-out button (Task C).
 *
 * THE BEHAVIOUR THIS REPLACES. A learner reached the final activity and
 * the only forward control on the screen was a disabled Next — and a quiz,
 * assignment or live session left until last had no ending at all.
 *
 * WHAT IS ASSERTED. The activity that finishes the course carries "Finish
 * course" in place of Next, whether or not it is finished yet; it waits
 * (with the reason) while the activity cannot be completed; it cannot be
 * pressed twice while finishing; and ordinary mid-course navigation is
 * untouched.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerActionBar } from './PlayerActionBar';
import type { PlayerFinishAction } from './PlayerActionBar';
import type { CourseSequenceItem } from '@types';
import {
  isFinalActivity,
  isSequenceItemFinished,
} from '../utils/sequence.utils';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

afterEach(cleanup);

const item = (id: string, state: string, type = 'lesson') =>
  ({ id, type, title: id, state }) as unknown as CourseSequenceItem;

function renderBar(
  overrides: Partial<React.ComponentProps<typeof PlayerActionBar>> = {}
) {
  return render(
    <MemoryRouter>
      <PlayerActionBar
        previous={undefined}
        next={undefined}
        language={'en' as never}
        onGoTo={vi.fn()}
        isCompleted={false}
        canComplete
        {...overrides}
      />
    </MemoryRouter>
  );
}

const finish = (overrides: Partial<PlayerFinishAction> = {}) => ({
  onFinish: vi.fn(),
  isFinishing: false,
  canFinish: true,
  ...overrides,
});

describe('the activity that finishes the course', () => {
  it('offers Finish course instead of a dead Next — before it is finished', () => {
    const action = finish();
    renderBar({ finish: action, onComplete: vi.fn() });
    expect(screen.queryByText('learning:player.next')).toBeNull();
    // Finish completes it too: no second "Mark complete" beside it.
    expect(
      screen.queryByText('learning:player.completion.markComplete')
    ).toBeNull();
    fireEvent.click(screen.getByTestId('player-finish-course'));
    expect(action.onFinish).toHaveBeenCalledTimes(1);
  });

  it('and after it is finished (a refresh, a direct visit, coming back)', () => {
    renderBar({ finish: finish(), isCompleted: true });
    expect(screen.getByTestId('player-finish-course')).toHaveProperty(
      'disabled',
      false
    );
  });

  it('waits, and says why, while the activity cannot be completed yet', () => {
    renderBar({
      finish: finish({
        canFinish: false,
        hintKey: 'learning:player.completion.watchMoreHint',
      }),
    });
    expect(screen.getByTestId('player-finish-course')).toHaveProperty(
      'disabled',
      true
    );
    expect(
      screen.getByText('learning:player.completion.watchMoreHint')
    ).toBeTruthy();
  });

  it('cannot be pressed again while finishing', () => {
    renderBar({ finish: finish({ isFinishing: true }) });
    const button = screen.getByTestId('player-finish-course');
    expect(button).toHaveProperty('disabled', true);
    expect(button.textContent).toContain('learning:player.finishing');
  });
});

describe('everywhere else', () => {
  it('leaves mid-course navigation exactly as it was', () => {
    const onGoTo = vi.fn();
    const next = item('i2', 'available');
    renderBar({ next, onGoTo });
    expect(screen.queryByTestId('player-finish-course')).toBeNull();
    fireEvent.click(screen.getByText('learning:player.next'));
    expect(onGoTo).toHaveBeenCalledWith(next);
  });
});

describe('isFinalActivity — which activity finishes the course', () => {
  it('the last one, when everything before it is finished — whatever its type', () => {
    for (const type of ['lesson', 'quiz', 'assignment', 'live_session']) {
      const items = [item('a', 'completed'), item('b', 'available', type)];
      expect(isFinalActivity(items, items[1])).toBe(true);
    }
  });

  it('an earlier one the learner left until last', () => {
    const items = [item('a', 'available'), item('b', 'completed')];
    expect(isFinalActivity(items, items[0])).toBe(true);
  });

  it('not while another activity is still open', () => {
    const items = [item('a', 'failed', 'quiz'), item('b', 'available')];
    expect(isFinalActivity(items, items[1])).toBe(false);
  });

  it('a submitted assignment counts as finished, as the server counts it', () => {
    expect(isSequenceItemFinished('submitted')).toBe(true);
    const items = [
      item('a', 'submitted', 'assignment'),
      item('b', 'available'),
    ];
    expect(isFinalActivity(items, items[1])).toBe(true);
  });

  it('a single-activity course: that activity', () => {
    const items = [item('only', 'available', 'quiz')];
    expect(isFinalActivity(items, items[0])).toBe(true);
  });

  it('nothing on screen: never', () => {
    expect(isFinalActivity([item('a', 'completed')], undefined)).toBe(false);
  });
});
