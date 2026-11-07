/**
 * Quiz focus mode (B0-LRN-11).
 *
 * When a quiz requires full screen and the browser cannot provide it (every
 * browser on iPhone), the attempt runs in a focus layout instead: the
 * academy's header, footer and bars and the player's curriculum step aside
 * so the quiz fills the screen. The running quiz marks `<body>` with
 * `QUIZ_FOCUS_ATTRIBUTE` (`useQuizFocusMode`) and removes it when the
 * attempt ends or the page is left; the surrounding layouts only read it,
 * through CSS, so nothing is unmounted and nothing changes when the
 * attribute is absent.
 */

/** Set on `<body>` while a quiz attempt runs in focus mode. */
export const QUIZ_FOCUS_ATTRIBUTE = 'data-quiz-focus';

/** Hides an element of the surrounding layout while the quiz is in focus mode. */
export const HIDDEN_IN_QUIZ_FOCUS = '[body[data-quiz-focus]_&]:!hidden';
