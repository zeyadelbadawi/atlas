/**
 * The public course preview dialog.
 *
 * What these protect is the honesty of the surface, not its markup: a
 * YouTube preview must be rendered through the vetted-id player and never
 * from a raw URL; a refusal must read the same whatever the reason,
 * because the server deliberately answers an unreachable lesson with 404
 * so the preview flag cannot become an oracle for a paid catalogue's
 * lesson ids; and a preview that is not a video must say so rather than
 * render an empty player.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { CoursePreviewDialog } from './CoursePreviewDialog';

const grantState: {
  grant: unknown;
  isLoading: boolean;
  failure: unknown;
} = { grant: null, isLoading: false, failure: null };

vi.mock('@features/learner', () => ({
  useLessonGrant: () => grantState,
  YouTubeLessonPlayer: ({ embed }: { embed: { videoId: string } }) => (
    <div data-testid="youtube-player">{embed.videoId}</div>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

afterEach(() => {
  cleanup();
  grantState.grant = null;
  grantState.isLoading = false;
  grantState.failure = null;
});

function renderDialog(lessonId: string | null = 'lesson-1'): void {
  render(
    <CoursePreviewDialog
      courseId="course-1"
      lessonId={lessonId}
      lessonTitle="Intro to Hooks"
      onOpenChange={() => {}}
    />
  );
}

describe('CoursePreviewDialog', () => {
  it('renders nothing while there is no lesson to preview', () => {
    renderDialog(null);
    expect(screen.queryByText('Intro to Hooks')).toBeNull();
  });

  it('announces loading in a live region rather than showing an empty frame', () => {
    grantState.isLoading = true;
    renderDialog();
    const status = screen.getByRole('status');
    expect(status.textContent).toContain(
      'website:renderer.courseDetails.previewLoading'
    );
    expect(screen.queryByTestId('youtube-player')).toBeNull();
  });

  it('plays a YouTube preview through the vetted-id player, never a raw URL', () => {
    grantState.grant = {
      kind: 'external',
      title: 'Intro to Hooks',
      externalEmbed: { provider: 'youtube', videoId: 'dQw4w9WgXcQ' },
      externalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    };
    renderDialog();
    expect(screen.getByTestId('youtube-player').textContent).toBe(
      'dQw4w9WgXcQ'
    );
    // The raw address never reaches the DOM.
    expect(document.body.innerHTML).not.toContain('youtube.com/watch');
  });

  it('plays a hosted video preview with download disabled', () => {
    grantState.grant = {
      kind: 'video',
      title: 'Intro to Hooks',
      video: {
        format: 'mp4',
        url: 'https://cdn.example/v.mp4',
        downloadable: false,
      },
    };
    renderDialog();
    const video = screen.getByTestId('course-preview-video');
    expect(video.getAttribute('controlslist')).toBe('nodownload');
    expect(video.getAttribute('src')).toBe('https://cdn.example/v.mp4');
  });

  it('gives one unrevealing message for any refusal', () => {
    grantState.failure = { reason: 'notEnrolled' };
    renderDialog();
    const status = screen.getByRole('status');
    expect(status.textContent).toContain(
      'website:renderer.courseDetails.previewUnavailable'
    );
    // Never names the reason — that is what keeps 404 meaningful.
    expect(document.body.innerHTML).not.toContain('notEnrolled');
  });

  it('says plainly when a preview lesson is not a video', () => {
    grantState.grant = {
      kind: 'text',
      title: 'Intro to Hooks',
      bodyHtml: '<p>hi</p>',
    };
    renderDialog();
    expect(screen.getByRole('status').textContent).toContain(
      'website:renderer.courseDetails.previewNotPlayable'
    );
  });
});
