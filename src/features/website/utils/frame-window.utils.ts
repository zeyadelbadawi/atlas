/**
 * The window a rendered node is actually displayed in.
 *
 * The dashboard previews render the website through a portal into an
 * `<iframe>` (`PreviewViewport`) while its code keeps running in the
 * dashboard's own JavaScript context — so the global `window` there is the
 * DASHBOARD's: its scroll position, its width for `matchMedia`, its height
 * for "is this on screen". Website code that asks those questions asks the
 * node's own window instead, which is the preview frame's in a preview and
 * the page's own on the public site (where the two are the same).
 */
export function windowOf(node: Node | null | undefined): Window {
  return node?.ownerDocument?.defaultView ?? window;
}

/**
 * `IntersectionObserver` options observing `node` against the viewport it
 * is displayed in. On the public site that is the default (the top-level
 * viewport); inside a preview frame the frame's own document is the root,
 * so "in view" means in view on the previewed device.
 */
export function intersectionRootFor(
  node: Node,
  options: IntersectionObserverInit
): IntersectionObserverInit {
  const doc = node.ownerDocument;
  return doc && doc !== document ? { ...options, root: doc } : options;
}
