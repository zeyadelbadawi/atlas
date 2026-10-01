/**
 * Wraps an auth page's body (sign in, sign up, password reset, email
 * verification) in the active theme's auth frame. Themes without one get
 * the body exactly as it was — no wrapper element at all.
 */
import type { ReactNode } from 'react';
import { useThemePack } from '../theme-packs/ThemePackContext';

export function WebsiteAuthFrame({
  children,
}: {
  readonly children: ReactNode;
}): JSX.Element {
  const Frame = useThemePack().chrome?.AuthFrame;
  return Frame ? <Frame>{children}</Frame> : <>{children}</>;
}
