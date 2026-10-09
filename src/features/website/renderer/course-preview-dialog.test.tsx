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

vi.mock('@features/learner', async () => ({
  // The real forensic watermark frame: a preview is watermarked too.
  ...(await import('@features/learner/components/forensic')),
  useLessonGrant: () => grantState,
  YouTubeLessonPlayer: ({
    embed,
    watermark,
  }: {
    embed: { videoId: string };
    watermark: { code?: string };
  }) => (
    <div data-testid="youtube-player" data-watermark={watermark?.code}>
      {embed.videoId}
    </div>
  ),
}));

const PREVIEW_WATERMARK = {
  enabled: true,
  text: '7K3QM-X9TR2 · academy.example · Preview',
  code: '7K3QM-X9TR2',
  kind: 'preview',
  maskedIdentity: null,
  host: 'academy.example',
} as const;

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
      watermark: PREVIEW_WATERMARK,
    };
    renderDialog();
    expect(screen.getByTestId('youtube-player').textContent).toBe(
      'dQw4w9WgXcQ'
    );
    // The embed is handed the grant's forensic watermark to draw.
    expect(
      screen.getByTestId('youtube-player').getAttribute('data-watermark')
    ).toBe('7K3QM-X9TR2');
    // The raw address never reaches the DOM.
    expect(document.body.innerHTML).not.toContain('youtube.com/watch');
  });

  it('plays a hosted video preview inside the forensic watermark frame, with no download, fullscreen, PiP or casting of the bare element', () => {
    grantState.grant = {
      kind: 'video',
      title: 'Intro to Hooks',
      video: {
        format: 'mp4',
        url: 'https://cdn.example/v.mp4',
        downloadable: false,
      },
      watermark: PREVIEW_WATERMARK,
    };
    renderDialog();
    const video = screen.getByTestId('course-preview-video');
    const controls = (video.getAttribute('controlslist') ?? '').split(' ');
    expect(controls).toEqual(
      expect.arrayContaining(['nodownload', 'nofullscreen', 'noremoteplayback'])
    );
    expect(video.hasAttribute('disablepictureinpicture')).toBe(true);
    expect(video.getAttribute('x-webkit-airplay')).toBe('deny');
    expect(video.getAttribute('src')).toBe('https://cdn.example/v.mp4');

    // The video sits inside the frame, under the code and its pattern.
    const frame = video.closest('[data-forensic-frame]');
    expect(frame).toBeTruthy();
    const label = screen.getByTestId('forensic-watermark-label');
    expect(frame?.contains(label)).toBe(true);
    expect(label.textContent).toContain('7K3QM-X9TR2');
    expect(label.textContent).toContain('academy.example');
    expect(
      screen.getByTestId('forensic-watermark-pattern').style.backgroundImage
    ).toContain('data:image/svg+xml');
    expect(screen.getByTestId('forensic-watermark-caption')).toBeTruthy();
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
