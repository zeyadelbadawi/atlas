/**
 * The end of a course, which used to be a greyed-out button.
 *
 * THE BEHAVIOUR THIS REPLACES. A learner reached the final lesson, pressed
 * "Mark as complete", and the only forward control on the screen went
 * disabled. Nothing said the course was finished, and there was nowhere to
 * go — at the one moment in the course where the learner has most earned a
 * next step.
 *
 * WHAT IS ASSERTED. That the dead Next button is gone; that the actions
 * offered are only the ones that genuinely exist (a certificate link only
 * when a certificate has actually been issued); that finishing the last
 * activity while earlier ones are still open does NOT claim the course is
 * complete; and that ordinary mid-course navigation is untouched.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PlayerActionBar } from './PlayerActionBar';
import type { PlayerCourseCompletion } from './PlayerActionBar';
import type { CourseSequenceItem } from '@types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

afterEach(cleanup);

const nextItem = {
  id: 'i2',
  type: 'lesson',
  title: 'Next lesson',
  state: 'available',
} as unknown as CourseSequenceItem;

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
        isCompleted
        canComplete
        {...overrides}
      />
    </MemoryRouter>
  );
}

const complete: PlayerCourseCompletion = {
  isCourseComplete: true,
  courseHref: '/my/courses/c1',
  certificateHref: '/my/certificates',
  reviewHref: '/courses/c1',
};

describe('the last activity, once it is finished', () => {
  it('replaces the dead Next button with a completion state', () => {
    renderBar({ courseCompletion: complete });

    // The whole point: no disabled Next left behind.
    expect(screen.queryByText('learning:player.next')).toBeNull();
    expect(
      screen.getByText('learning:player.courseComplete.title')
    ).toBeTruthy();
  });

  it('offers the certificate and review only as real destinations', () => {
    renderBar({ courseCompletion: complete });

    const certificate = screen.getByText(
      'learning:player.courseComplete.viewCertificate'
    ).closest('a');
    expect(certificate?.getAttribute('href')).toBe('/my/certificates');

    const review = screen.getByText(
      'learning:player.courseComplete.rateCourse'
    ).closest('a');
    expect(review?.getAttribute('href')).toBe('/courses/c1');
  });

  it('shows no certificate button when no certificate was issued', () => {
    // Eligibility is the server's answer, never this component's guess.
    renderBar({
      courseCompletion: { ...complete, certificateHref: undefined },
    });
    expect(
      screen.queryByText('learning:player.courseComplete.viewCertificate')
    ).toBeNull();
    // The course is still complete, and there is still a way onward.
    expect(
      screen.getByText('learning:player.courseComplete.backToCourse')
    ).toBeTruthy();
  });

  it('does not claim the course is complete when earlier work is open', () => {
    renderBar({
      courseCompletion: {
        isCourseComplete: false,
        courseHref: '/my/courses/c1',
      },
    });
    expect(screen.getByText('learning:player.courseEnd.title')).toBeTruthy();
    expect(
      screen.queryByText('learning:player.courseComplete.title')
    ).toBeNull();
    // …and it must not offer a certificate or a review for a course that
    // is not actually finished.
    expect(
      screen.queryByText('learning:player.courseComplete.viewCertificate')
    ).toBeNull();
    expect(
      screen.queryByText('learning:player.courseComplete.rateCourse')
    ).toBeNull();
  });

  it('announces itself without interrupting', () => {
    renderBar({ courseCompletion: complete });
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0);
  });
});

describe('everywhere else', () => {
  it('leaves mid-course navigation exactly as it was', () => {
    renderBar({ next: nextItem, courseCompletion: complete });
    // There IS a next activity, so this is not the terminal state at all.
    expect(screen.getByText('learning:player.next')).toBeTruthy();
    expect(
      screen.queryByText('learning:player.courseComplete.title')
    ).toBeNull();
  });

  it('keeps Next for an unfinished last activity', () => {
    // Not completed yet: the bar is still ordinary navigation.
    renderBar({ isCompleted: false, courseCompletion: complete });
    expect(screen.getByText('learning:player.next')).toBeTruthy();
    expect(
      screen.queryByText('learning:player.courseComplete.title')
    ).toBeNull();
  });

  it('is inert on a surface that supplies no completion model', () => {
    renderBar({ courseCompletion: undefined });
    expect(screen.getByText('learning:player.next')).toBeTruthy();
  });
});
