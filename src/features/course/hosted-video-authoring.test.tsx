/**
 * B0-MED-11 — Atlas-hosted video for a Video lesson.
 *
 *   - while `hostedVideoAuthoring` is off, nothing changes: a video lesson
 *     takes a YouTube link only (see lesson-video-source.test.tsx);
 *   - when on, the dialog offers "Upload a video" and "Choose an uploaded
 *     video"; an upload shows progress and attaches the asset; the YouTube
 *     field steps aside while a hosted video is attached; Remove detaches;
 *   - the library lists only videos whose upload finished;
 *   - the upload helper declares the length (+ margin) and the size, PUTs
 *     the signed MP4 content type, and calls completion only when asked.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { AtlasLocalizationProvider } from '@app/providers/localization/LocalizationProvider';
import type * as ConfigModule from '@config';
import type { FeatureFlag } from '@config';
import type { CourseLessonFormData } from './schemas/course.schemas';
import {
  uploadHostedVideo,
  FALLBACK_DECLARED_SECONDS,
  HostedVideoUploadError,
  type HostedVideoUploadOptions,
} from './utils/hosted-video-upload';
import { hostedVideoLessonPatch } from './utils/hosted-video-lesson.utils';
import { ApiError } from '@services/api/api-error';

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}

// Radix Select scrolls the highlighted option into view; jsdom has no layout.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

const flags = vi.hoisted(() => ({ hostedVideoAuthoring: true }));
vi.mock('@config', async (orig) => {
  const actual = (await orig()) as typeof ConfigModule;
  return {
    ...actual,
    isFeatureEnabled: (flag: FeatureFlag) =>
      flag === 'hostedVideoAuthoring'
        ? flags.hostedVideoAuthoring
        : actual.isFeatureEnabled(flag),
  };
});
vi.mock('@features/unsaved-changes', () => ({
  useDirtyGuard: () => ({ requestClose: (close: () => void) => close() }),
}));

const { LessonFormDialog } = await import('./components/LessonFormDialog');

const VIDEO_LESSON: CourseLessonFormData = {
  title: 'Lesson',
  description: '',
  contentType: 'video',
  contentUrl: '',
  status: 'draft',
  bodyHtml: '',
};

function renderDialog(
  overrides: Partial<Parameters<typeof LessonFormDialog>[0]> = {},
  language: 'en' | 'ar' = 'en'
) {
  const onSubmit = vi.fn();
  const onUploadHostedVideo = vi.fn(
    async (file: File, onProgress: (p: number) => void) => {
      onProgress(50);
      return { id: 'asset-1', fileName: file.name };
    }
  );
  const loadHostedVideos = vi.fn(async () => [
    {
      id: 'ready-1',
      fileName: 'intro.mp4',
      processingStatus: 'ready' as const,
      durationSeconds: 60,
      createdAt: '',
    },
    {
      id: 'pending-1',
      fileName: 'broken.mp4',
      processingStatus: 'pending' as const,
      durationSeconds: null,
      createdAt: '',
    },
  ]);
  render(
    <AtlasLocalizationProvider initialLanguage={language}>
      <LessonFormDialog
        open
        onOpenChange={vi.fn()}
        mode="create"
        defaultValues={VIDEO_LESSON}
        isPending={false}
        onSubmit={onSubmit}
        onUploadHostedVideo={onUploadHostedVideo}
        loadHostedVideos={loadHostedVideos}
        {...overrides}
      />
    </AtlasLocalizationProvider>
  );
  return { onSubmit, onUploadHostedVideo, loadHostedVideos };
}

beforeEach(() => {
  flags.hostedVideoAuthoring = true;
});
afterEach(() => cleanup());

describe('lesson dialog — hosted video (B0-MED-11)', () => {
  it('is not offered while the feature is off, even when the editor passes handlers', () => {
    flags.hostedVideoAuthoring = false;
    renderDialog();
    expect(screen.queryByTestId('hosted-video-field')).toBeNull();
    expect(
      screen.getByText(
        'Paste a YouTube link to a Public or Unlisted video that allows embedding. Private and members-only videos won’t play for your learners. Uploading videos to Atlas is not available yet.'
      )
    ).toBeTruthy();
  });

  it('uploads a video, attaches it, hides the YouTube field and submits the asset', async () => {
    const { onSubmit, onUploadHostedVideo } = renderDialog();
    expect(screen.getByText('Or paste a YouTube link instead.')).toBeTruthy();

    const file = new File(['bytes'], 'lesson.mp4', { type: 'video/mp4' });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [file] },
    });

    await waitFor(() =>
      expect(screen.getByText('Attached: lesson.mp4')).toBeTruthy()
    );
    expect(onUploadHostedVideo).toHaveBeenCalledWith(
      file,
      expect.any(Function),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(screen.queryByLabelText('Content URL')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      hostedVideo: { mediaAssetId: 'asset-1', fileName: 'lesson.mp4' },
    });
  });

  it('refuses a non-MP4 file before uploading', async () => {
    const { onUploadHostedVideo } = renderDialog();
    const file = new File(['bytes'], 'clip.mov', { type: 'video/quicktime' });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [file] },
    });
    expect(await screen.findByText('Upload an MP4 video.')).toBeTruthy();
    expect(onUploadHostedVideo).not.toHaveBeenCalled();
  });

  it('removing an attached video brings the YouTube field back and submits null', async () => {
    const { onSubmit } = renderDialog({
      mode: 'edit',
      defaultValues: {
        ...VIDEO_LESSON,
        hostedVideo: { mediaAssetId: 'old', fileName: '' },
      },
    });
    expect(
      screen.getByText('A video hosted by Atlas is attached.')
    ).toBeTruthy();
    expect(screen.queryByLabelText('Content URL')).toBeNull();
    fireEvent.click(screen.getByTestId('hosted-video-remove'));
    expect(screen.getByLabelText('Content URL')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Save Lesson' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0].hostedVideo).toBeNull();
  });

  it('offers only finished uploads from the library', async () => {
    const { loadHostedVideos } = renderDialog();
    fireEvent.click(screen.getByTestId('hosted-video-library'));
    await waitFor(() => expect(loadHostedVideos).toHaveBeenCalled());
    const trigger = await screen.findByTestId('hosted-video-select');
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(
      await screen.findByRole('option', { name: 'intro.mp4' })
    ).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'broken.mp4' })).toBeNull();
  });
});

describe('lesson dialog — upload states (B0-MED-11)', () => {
  const MP4 = () => new File(['bytes'], 'lesson.mp4', { type: 'video/mp4' });

  it('shows Processing while the server checks the file, with no Cancel', async () => {
    let finish: () => void = () => undefined;
    const onUploadHostedVideo = vi.fn(
      (
        file: File,
        onProgress: (p: number) => void,
        options?: HostedVideoUploadOptions
      ) =>
        new Promise<{ id: string; fileName: string }>((resolve) => {
          onProgress(100);
          options?.onPhase?.('processing');
          finish = () => resolve({ id: 'asset-9', fileName: file.name });
        })
    );
    renderDialog({ onUploadHostedVideo });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    expect(await screen.findByText('Processing…')).toBeTruthy();
    expect(screen.queryByTestId('hosted-video-cancel')).toBeNull();
    // Saving waits for the upload.
    expect(
      screen.getByRole('button', { name: 'Save Lesson' }).hasAttribute('disabled')
    ).toBe(true);
    finish();
    expect(await screen.findByText('Attached: lesson.mp4')).toBeTruthy();
  });

  it('Cancel aborts the transfer, attaches nothing and says so', async () => {
    const onUploadHostedVideo = vi.fn(
      (
        _file: File,
        onProgress: (p: number) => void,
        options?: HostedVideoUploadOptions
      ) =>
        new Promise<{ id: string; fileName: string }>((_resolve, reject) => {
          onProgress(10);
          options?.signal?.addEventListener('abort', () =>
            reject(new HostedVideoUploadError('cancelled'))
          );
        })
    );
    const { onSubmit } = renderDialog({ onUploadHostedVideo });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    fireEvent.click(await screen.findByTestId('hosted-video-cancel'));
    expect(
      await screen.findByText('Upload cancelled. Nothing was added to the lesson.')
    ).toBeTruthy();
    expect(screen.queryByText(/Attached:/)).toBeNull();
    expect(screen.queryByTestId('hosted-video-error')).toBeNull();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closing the dialog mid-upload aborts the transfer (the reservation is then released)', async () => {
    let signal: AbortSignal | undefined;
    const onUploadHostedVideo = vi.fn(
      (
        _file: File,
        _onProgress: (p: number) => void,
        options?: HostedVideoUploadOptions
      ) => {
        signal = options?.signal;
        return new Promise<{ id: string; fileName: string }>(() => undefined);
      }
    );
    renderDialog({ onUploadHostedVideo });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    await waitFor(() => expect(signal).toBeDefined());
    expect(signal?.aborted).toBe(false);
    cleanup();
    expect(signal?.aborted).toBe(true);
  });

  it('a failed transfer to storage reads as a connection problem', async () => {
    renderDialog({
      onUploadHostedVideo: vi.fn(async () => {
        throw new HostedVideoUploadError('transfer');
      }),
    });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    expect((await screen.findByTestId('hosted-video-error')).textContent).toBe(
      'The video could not be uploaded. Check your connection and try again.'
    );
  });

  const quotaRefusal = () =>
    new ApiError({
      kind: 'conflict',
      status: 409,
      retryable: false,
      messageKey: 'errors.entitlement.videoStorageMinutesExceeded',
    });

  it('a quota refusal is shown in the author’s language (English)', async () => {
    renderDialog({
      onUploadHostedVideo: vi.fn(async () => {
        throw quotaRefusal();
      }),
    });
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    expect((await screen.findByTestId('hosted-video-error')).textContent).toBe(
      "Adding this video would take the academy past its plan's video minutes. Upgrade the plan, or remove videos that are no longer needed, to make room."
    );
  });

  it('a quota refusal is shown in the author’s language (Arabic)', async () => {
    renderDialog(
      {
        onUploadHostedVideo: vi.fn(async () => {
          throw quotaRefusal();
        }),
      },
      'ar'
    );
    fireEvent.change(screen.getByTestId('hosted-video-input'), {
      target: { files: [MP4()] },
    });
    expect((await screen.findByTestId('hosted-video-error')).textContent).toBe(
      'إضافة هذا الفيديو ستتجاوز دقائق الفيديو المتاحة في خطة الأكاديمية. قم بترقية الخطة، أو احذف فيديوهات لم تعد بحاجة إليها، لإتاحة مساحة.'
    );
  });
});

describe('hostedVideoLessonPatch — the save payload honours the switch (B0-MED-11)', () => {
  const video = { contentType: 'video' as const };
  const attached = { mediaAssetId: 'asset-1', fileName: 'a.mp4' };

  it('sends nothing about a hosted video while the feature is off', () => {
    for (const mode of ['create', 'edit'] as const) {
      expect(
        hostedVideoLessonPatch({
          enabled: false,
          mode,
          data: { ...video, hostedVideo: attached },
        })
      ).toEqual({});
      expect(
        hostedVideoLessonPatch({
          enabled: false,
          mode,
          data: { ...video, hostedVideo: null },
          currentVideoAssetId: 'old',
        })
      ).toEqual({});
    }
  });

  it('attaches when on, and detaches a removed or no-longer-video one on edit', () => {
    expect(
      hostedVideoLessonPatch({
        enabled: true,
        mode: 'create',
        data: { ...video, hostedVideo: attached },
      })
    ).toEqual({ videoAssetId: 'asset-1' });
    expect(
      hostedVideoLessonPatch({
        enabled: true,
        mode: 'edit',
        data: { ...video, hostedVideo: null },
        currentVideoAssetId: 'old',
      })
    ).toEqual({ videoAssetId: null });
    expect(
      hostedVideoLessonPatch({
        enabled: true,
        mode: 'edit',
        data: { contentType: 'text', hostedVideo: undefined },
        currentVideoAssetId: 'old',
      })
    ).toEqual({ videoAssetId: null });
    expect(
      hostedVideoLessonPatch({
        enabled: true,
        mode: 'edit',
        data: { ...video, hostedVideo: undefined },
        currentVideoAssetId: 'old',
      })
    ).toEqual({});
  });
});

describe('uploadHostedVideo (B0-MED-11)', () => {
  const ticket = {
    assetId: 'a-1',
    uploadUrl: 'https://store.test/put',
    expiresAt: '',
    reservedMinutes: 2,
    securityTier: 'normal',
    requiresCompletionCall: true,
  };

  it('declares the measured length plus a margin and the size, PUTs MP4, then completes', async () => {
    const service = {
      createHostedVideoUpload: vi.fn(async () => ticket),
      completeHostedVideoUpload: vi.fn(async () => ({}) as never),
    };
    const put = vi.fn(async () => undefined);
    const file = new File(['12345'], 'l.mp4', { type: 'video/mp4' });
    const result = await uploadHostedVideo(
      service,
      { academyId: 'ac', courseId: 'co', file },
      { readDuration: async () => 100, put }
    );
    expect(service.createHostedVideoUpload).toHaveBeenCalledWith('ac', {
      fileName: 'l.mp4',
      maxDurationSeconds: 130,
      courseId: 'co',
      sizeBytes: 5,
    });
    expect(put).toHaveBeenCalledWith(
      ticket.uploadUrl,
      file,
      'video/mp4',
      undefined
    );
    expect(service.completeHostedVideoUpload).toHaveBeenCalledWith('ac', 'a-1');
    expect(result).toEqual({ id: 'a-1', fileName: 'l.mp4' });
  });

  it('falls back to a ceiling when the length is unknown, and skips completion when not asked', async () => {
    const service = {
      createHostedVideoUpload: vi.fn(async () => ({
        ...ticket,
        requiresCompletionCall: false,
      })),
      completeHostedVideoUpload: vi.fn(),
    };
    await uploadHostedVideo(
      service as never,
      {
        academyId: 'ac',
        courseId: 'co',
        file: new File(['1'], 'x.mp4', { type: 'video/mp4' }),
      },
      { readDuration: async () => null, put: async () => undefined }
    );
    expect(service.createHostedVideoUpload).toHaveBeenCalledWith(
      'ac',
      expect.objectContaining({ maxDurationSeconds: FALLBACK_DECLARED_SECONDS })
    );
    expect(service.completeHostedVideoUpload).not.toHaveBeenCalled();
  });

  it('releases the reservation when the transfer fails or is cancelled', async () => {
    for (const reason of ['transfer', 'cancelled'] as const) {
      const service = {
        createHostedVideoUpload: vi.fn(async () => ticket),
        completeHostedVideoUpload: vi.fn(),
        cancelHostedVideoUpload: vi.fn(async () => ({}) as never),
      };
      await expect(
        uploadHostedVideo(
          service as never,
          {
            academyId: 'ac',
            courseId: 'co',
            file: new File(['1'], 'x.mp4', { type: 'video/mp4' }),
          },
          {
            readDuration: async () => 10,
            put: async () => {
              throw new HostedVideoUploadError(reason);
            },
          }
        )
      ).rejects.toMatchObject({ reason });
      expect(service.cancelHostedVideoUpload).toHaveBeenCalledWith('ac', 'a-1');
      expect(service.completeHostedVideoUpload).not.toHaveBeenCalled();
    }
  });

  it('releases the reservation when completion is refused, and passes the abort signal to the PUT', async () => {
    const refusal = new Error('refused');
    const service = {
      createHostedVideoUpload: vi.fn(async () => ticket),
      completeHostedVideoUpload: vi.fn(async () => {
        throw refusal;
      }),
      cancelHostedVideoUpload: vi.fn(async () => {
        throw new Error('offline');
      }),
    };
    const put = vi.fn(async () => undefined);
    const phases: string[] = [];
    const controller = new AbortController();
    await expect(
      uploadHostedVideo(
        service as never,
        {
          academyId: 'ac',
          courseId: 'co',
          file: new File(['1'], 'x.mp4', { type: 'video/mp4' }),
          signal: controller.signal,
          onPhase: (phase) => phases.push(phase),
        },
        { readDuration: async () => 10, put }
      )
    ).rejects.toBe(refusal);
    expect(put).toHaveBeenCalledWith(
      ticket.uploadUrl,
      expect.any(File),
      'video/mp4',
      undefined,
      controller.signal
    );
    expect(phases).toEqual(['uploading', 'processing']);
    // A cancel that cannot get through never hides the real error.
    expect(service.cancelHostedVideoUpload).toHaveBeenCalledWith('ac', 'a-1');
  });

  it('does not reserve anything when cancelled before the upload starts', async () => {
    const service = {
      createHostedVideoUpload: vi.fn(async () => ticket),
      completeHostedVideoUpload: vi.fn(),
    };
    const controller = new AbortController();
    controller.abort();
    await expect(
      uploadHostedVideo(
        service as never,
        {
          academyId: 'ac',
          courseId: 'co',
          file: new File(['1'], 'x.mp4', { type: 'video/mp4' }),
          signal: controller.signal,
        },
        { readDuration: async () => 10, put: async () => undefined }
      )
    ).rejects.toMatchObject({ reason: 'cancelled' });
    expect(service.createHostedVideoUpload).not.toHaveBeenCalled();
  });
});
