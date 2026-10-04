/**
 * Scenes play only on the public runtime (`linkRenderer` present). Builder
 * previews and the scaled dashboard miniatures stay static.
 */
export function isCinematicRuntime(linkRenderer: unknown): boolean {
  return !!linkRenderer;
}
