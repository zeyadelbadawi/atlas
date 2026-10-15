/**
 * B0-LRN-11 — what the full-screen copy says about phones.
 *
 * WHAT WAS WRONG. The quiz settings help said browsers that cannot use full
 * screen are "most phones" («معظم الهواتف»), and the reviewer's signal said
 * "Phones and some tablets have no full screen". The code does not decide by
 * device: `isFullscreenSupported` asks the browser for the Fullscreen API
 * (`document.fullscreenEnabled` + `requestFullscreen`). Android browsers
 * expose it, so on most phones in Atlas's market the quiz IS held in full
 * screen; the browsers on iPhone do not (WebKit offers no element full
 * screen there), so they take the quiz as usual and the reviewer sees
 * "Full screen unavailable". The copy has to say that, in both languages.
 */
import { describe, expect, it } from 'vitest';
import enCourse from '@localization/resources/en/course.json';
import arCourse from '@localization/resources/ar/course.json';
import enInstructor from '@localization/resources/en/instructor.json';
import arInstructor from '@localization/resources/ar/instructor.json';
import { isFullscreenSupported } from './hooks/useQuizFullscreen';

const en = [
  enCourse.quizAuthoring.settings.fields.requireFullscreen.description,
  enInstructor.attemptReview.signals.key.fullscreen_unavailable.innocent,
];
const ar = [
  arCourse.quizAuthoring.settings.fields.requireFullscreen.description,
  arInstructor.attemptReview.signals.key.fullscreen_unavailable.innocent,
];

/** A document as a browser presents it, for `isFullscreenSupported`. */
function browserDocument(api: {
  fullscreenEnabled: boolean | undefined;
  requestFullscreen: boolean;
}): Document {
  return {
    fullscreenEnabled: api.fullscreenEnabled,
    documentElement: api.requestFullscreen
      ? { requestFullscreen: () => Promise.resolve() }
      : {},
  } as unknown as Document;
}

describe('full-screen copy about phones (B0-LRN-11)', () => {
  it('support is decided by the browser API, not by the device being a phone', () => {
    // Android Chrome / Samsung Internet: the standard API is present.
    expect(
      isFullscreenSupported(
        browserDocument({ fullscreenEnabled: true, requestFullscreen: true })
      )
    ).toBe(true);
    // iPhone (every browser is WebKit): no element full screen.
    expect(
      isFullscreenSupported(
        browserDocument({ fullscreenEnabled: undefined, requestFullscreen: false })
      )
    ).toBe(false);
  });

  it('never says that most phones, or phones in general, cannot use full screen', () => {
    for (const text of en) {
      expect(text).not.toMatch(/most phones/i);
      expect(text).not.toMatch(/^Phones/);
    }
    for (const text of ar) {
      expect(text).not.toContain('معظم الهواتف');
      expect(text).not.toContain('لا توفر الهواتف');
    }
  });

  it('names iPhone as the example, in both languages', () => {
    for (const text of [...en, ...ar]) {
      expect(text).toContain('iPhone');
    }
  });
});
