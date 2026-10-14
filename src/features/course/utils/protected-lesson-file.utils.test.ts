import { describe, expect, it, vi } from 'vitest';
import { attachProtectedLessonFile } from './protected-lesson-file.utils';

describe('attachProtectedLessonFile (B0-MED-05)', () => {
  it('attaches the file, then clears the public link it replaces', async () => {
    const calls: string[] = [];
    const attach = vi.fn(async (id: string) => calls.push(`attach:${id}`));
    const clearPublicLink = vi.fn(async () => calls.push('clear'));
    await attachProtectedLessonFile(
      { attach, clearPublicLink },
      { mediaAssetId: 'asset-1', publicLink: 'https://x.test/public/a.pdf' }
    );
    expect(calls).toEqual(['attach:asset-1', 'clear']);
  });

  it('leaves the lesson alone when there was no public link', async () => {
    const clearPublicLink = vi.fn();
    await attachProtectedLessonFile(
      { attach: vi.fn().mockResolvedValue(undefined), clearPublicLink },
      { mediaAssetId: 'asset-1', publicLink: null }
    );
    expect(clearPublicLink).not.toHaveBeenCalled();
  });

  it('never clears the public link when attaching fails', async () => {
    const clearPublicLink = vi.fn();
    await expect(
      attachProtectedLessonFile(
        { attach: vi.fn().mockRejectedValue(new Error('no')), clearPublicLink },
        { mediaAssetId: 'asset-1', publicLink: 'https://x.test/a.pdf' }
      )
    ).rejects.toThrow('no');
    expect(clearPublicLink).not.toHaveBeenCalled();
  });
});
