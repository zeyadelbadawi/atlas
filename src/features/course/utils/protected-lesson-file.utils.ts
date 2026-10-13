/**
 * B0-MED-05 — after a File lesson saves: attach the protected file, then
 * clear the public link it replaces. The content row already wins at
 * delivery; clearing the link stops the lesson pointing at a public copy
 * (and stops the old curriculum response from exposing it).
 *
 * Order matters: the link is cleared only once the protected file is
 * attached, so a failure never leaves the lesson with neither.
 */
export interface AttachProtectedLessonFileDeps {
  readonly attach: (mediaAssetId: string) => Promise<unknown>;
  readonly clearPublicLink: () => Promise<unknown>;
}

export async function attachProtectedLessonFile(
  deps: AttachProtectedLessonFileDeps,
  input: {
    readonly mediaAssetId: string;
    /** The lesson's `contentUrl` as saved. */
    readonly publicLink: string | null | undefined;
  }
): Promise<void> {
  await deps.attach(input.mediaAssetId);
  if (input.publicLink) await deps.clearPublicLink();
}
