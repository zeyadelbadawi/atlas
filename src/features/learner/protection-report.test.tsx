/**
 * The protection badge tells the truth (AD-16, finding D-5, §E.3, §6.1).
 *
 * THIS IS A REGRESSION TEST FOR A CLAIM, NOT FOR A RENDER. The field this
 * badge replaced was a `'protected' | 'unprotected'` word derived from
 * whether the content was an external embed — which meant a Premium-tier
 * video whose delivery edge re-checks nothing reported "protected", the
 * exact overstatement finding D-5 recorded and §V forbids ("no
 * learner-facing response overstates the protection actually enforced").
 *
 * The three things pinned here are the three that will be quietly undone
 * by a future "make the badge friendlier" change:
 *
 * 1. `boundToDevice: false` is SAID, in words, not omitted. Listing only
 *    the positives is the same lie as the old badge, told more carefully.
 * 2. No marketing verdict appears anywhere — §I sells the tiers as
 *    self-managed versus platform-managed delivery and never as "less
 *    secure" versus "secure", because on session binding and revocation
 *    the Normal tier is the STRONGER of the two.
 * 3. The absence of DRM is stated on every grant. Neither tier has it,
 *    Cloudflare Stream does not offer it at all (D1), and §6.1 forbids
 *    claiming download- or screen-record-proofing.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import type { ContentProtectionReport } from '@types';
import { ProtectionReport } from './components/ProtectionReport';

/**
 * A PREMIUM grant exactly as the backend reports it after D-5: the
 * provider's edge does not re-check the session or the device the token
 * was issued to, and a token cannot be withdrawn before it expires.
 */
const PREMIUM: ContentProtectionReport = {
  tier: 'premium',
  signedUrl: true,
  expiresInSeconds: 7200,
  boundToSession: false,
  boundToDevice: false,
  revocableBeforeExpiry: false,
  originRestricted: true,
  watermark: true,
  adaptiveBitrate: true,
  drm: false,
};

/** A NORMAL grant: shorter credential, and stronger on the two that matter. */
const NORMAL: ContentProtectionReport = {
  tier: 'normal',
  signedUrl: true,
  expiresInSeconds: 600,
  boundToSession: true,
  boundToDevice: true,
  revocableBeforeExpiry: true,
  originRestricted: true,
  watermark: true,
  adaptiveBitrate: false,
  drm: false,
};

/** An external embed: Atlas hosts nothing and protects nothing. */
const EXTERNAL: ContentProtectionReport = {
  tier: null,
  signedUrl: false,
  expiresInSeconds: 0,
  boundToSession: false,
  boundToDevice: false,
  revocableBeforeExpiry: false,
  originRestricted: false,
  watermark: false,
  adaptiveBitrate: false,
  drm: false,
};

/*
  One i18n instance for the file: `createI18nInstance` builds every
  namespace in the product, which is far more expensive than the render
  under test.
*/
const i18n = createI18nInstance('en');

/**
 * Generous, for the same reason the shell suite's is: this tree pulls in
 * the popover primitive and the whole translation bundle, and the full
 * suite running in parallel does exceed the 5 s default on a first mount.
 */
const RENDER_TIMEOUT = 20_000;

/*
  `fireEvent`, not `user-event`: opening a popover is one click with no
  typing, no focus choreography and nothing to await, and user-event's
  pointer sequence against a Radix layer in jsdom costs seconds per call
  for no additional fidelity here.
*/
function open(protection: ContentProtectionReport): void {
  render(
    <I18nextProvider i18n={i18n}>
      <ProtectionReport protection={protection} />
    </I18nextProvider>
  );

  fireEvent.click(screen.getByRole('button'));
}

afterEach(cleanup);

describe('protection report', () => {
  it('says plainly that Premium playback is not bound to the device', () => {
    open(PREMIUM);

    expect(
      screen.getByText(/not tied to this device/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/does not re-check your sign-in/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/cannot be withdrawn before the link expires/i)
    ).toBeTruthy();
  }, RENDER_TIMEOUT);

  it('reports the Normal tier as the stronger one where it actually is', () => {
    open(NORMAL);

    expect(
      screen.getByText(/re-checks your sign-in on every request/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/re-checks this device on every request/i)
    ).toBeTruthy();
    expect(
      screen.getByText(/can be withdrawn immediately/i)
    ).toBeTruthy();
  }, RENDER_TIMEOUT);

  it('never renders a marketing verdict on either tier', () => {
    for (const protection of [PREMIUM, NORMAL]) {
      open(protection);

      const text = document.body.textContent ?? '';
      expect(text).not.toMatch(/\bsecure\b/i);
      expect(text).not.toMatch(/\bsafe\b/i);
      expect(text).not.toMatch(/piracy/i);
      // "protected" may appear nowhere as a verdict either — the tiers are
      // named by how they are delivered, not by how good they are.
      expect(text).toMatch(/self-managed delivery|platform-managed delivery/i);

      cleanup();
    }
  }, RENDER_TIMEOUT);

  it('states the absence of DRM on every grant', () => {
    for (const protection of [PREMIUM, NORMAL]) {
      open(protection);

      expect(screen.getByText(/no DRM/i)).toBeTruthy();
      expect(screen.getByText(/prevents screen recording/i)).toBeTruthy();

      cleanup();
    }
  }, RENDER_TIMEOUT);

  it('tells the learner when the academy does not host the content at all', () => {
    open(EXTERNAL);

    expect(screen.getByText(/links to this content rather than hosting it/i)).toBeTruthy();
    // None of the per-capability claims may appear for an external embed:
    // there is nothing there for them to be true of.
    expect(screen.queryByText(/re-checks this device/i)).toBeNull();
    expect(screen.queryByText(/watermark/i)).toBeNull();
  }, RENDER_TIMEOUT);

  it('shows the credential’s real remaining life, not an optimistic one', () => {
    open(NORMAL);

    // 600 seconds is ten minutes, and that is what a learner is told —
    // finding D-3 is the case where an optimistic figure was printed
    // instead of the real one.
    expect(screen.getByText(/about 10 minutes/i)).toBeTruthy();
  }, RENDER_TIMEOUT);
});
