/**
 * Pure helpers for the in-player quiz attempt (P64 Phase 3, AD-8/AD-9).
 *
 * THE SERVER IS THE CLOCK. Every remaining-time number here is derived
 * from the server's `serverNow` and `deadlineAt` plus the local
 * monotonic clock, never from `Date.now()` alone: a laptop whose clock
 * is five minutes fast would otherwise show a countdown the server does
 * not agree with, and the learner would be told "time ran out" by one
 * side while the other was still accepting answers.
 *
 * Everything in this file is synchronous and side-effect free so the
 * behaviour the learner depends on — when the warnings fire, what counts
 * as answered, what the submit confirmation lists — is unit-tested with
 * fake numbers rather than a real timer.
 */
import { formatNumber, isolateNumericExpression } from '@utils';
import type {
  LanguageCode,
  QuizAnswer,
  QuizAttemptSession,
  QuizAttemptSettings,
  QuizLayout,
  QuizSessionQuestion,
} from '@types';
import { TEXT_QUESTION_TYPES } from '@types';

/** Seconds of grace the server allows after the deadline (mirrors `QUIZ_SUBMIT_GRACE_SECONDS`). */
export const QUIZ_SUBMIT_GRACE_SECONDS = 30;

/** Debounce between the last edit and the autosave request. */
export const AUTOSAVE_DEBOUNCE_MS = 1_500;

/** How often the integrity layer flushes its event queue. */
export const INTEGRITY_FLUSH_INTERVAL_MS = 2_000;

/** How often a heartbeat is recorded while an attempt is open (integrity on). */
export const INTEGRITY_HEARTBEAT_MS = 60_000;

/** Below this viewport width the default layout is one question per page. */
export const ONE_PER_PAGE_MAX_WIDTH = 640;

/**
 * Remaining seconds ("in words" announcements) — 10 min, 5 min, 1 min,
 * 30 s. Announced once each, when the countdown crosses the value.
 */
export const COUNTDOWN_ANNOUNCEMENTS: readonly number[] = [600, 300, 60, 30];

/**
 * The offset to add to the local clock to obtain the server clock,
 * measured when the session arrived. Positive when the server is ahead.
 */
export function serverClockOffsetMs(
  serverNowIso: string,
  clientNowMs: number
): number {
  const serverNow = Date.parse(serverNowIso);
  if (Number.isNaN(serverNow)) return 0;
  return serverNow - clientNowMs;
}

/**
 * Seconds until the deadline as the server sees it, or `null` when the
 * attempt has no deadline (legacy semantics with the flag off, or no
 * time limit). Never negative: the UI shows 0 while the grace window
 * runs and the server finalises.
 */
export function remainingSeconds(
  deadlineAtIso: string | null,
  clientNowMs: number,
  offsetMs: number
): number | null {
  if (!deadlineAtIso) return null;
  const deadline = Date.parse(deadlineAtIso);
  if (Number.isNaN(deadline)) return null;
  const serverNow = clientNowMs + offsetMs;
  return Math.max(0, Math.ceil((deadline - serverNow) / 1000));
}

/**
 * `12:30` / `1:05:20` in the product's digits, isolated so the colon
 * does not reorder the runs inside an RTL paragraph.
 */
export function formatCountdown(
  seconds: number,
  language: LanguageCode
): string {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  const parts = hours > 0 ? [hours, minutes, remaining] : [minutes, remaining];
  const expression = parts
    .map((part, index) =>
      index === 0
        ? formatNumber(part, language)
        : formatNumber(part, language, {
            minimumIntegerDigits: 2,
            useGrouping: false,
          })
    )
    .join(':');
  return isolateNumericExpression(expression);
}

/**
 * Which announcement, if any, the countdown has just crossed. Compares
 * the previous tick with the current one so an announcement fires once,
 * and so a tab that was throttled and skipped several seconds still
 * fires the one it crossed.
 */
export function crossedAnnouncement(
  previousSeconds: number | null,
  currentSeconds: number | null
): number | null {
  if (previousSeconds === null || currentSeconds === null) return null;
  for (const threshold of COUNTDOWN_ANNOUNCEMENTS) {
    if (previousSeconds > threshold && currentSeconds <= threshold) {
      return threshold;
    }
  }
  return null;
}

/** The countdown is "urgent" (tone change, still not colour-only) under two minutes. */
export function isUrgent(seconds: number | null): boolean {
  return seconds !== null && seconds <= 120;
}

export function isTextQuestion(type: QuizSessionQuestion['type']): boolean {
  return TEXT_QUESTION_TYPES.includes(type);
}

/** An answer counts once it carries a selection or non-blank text. */
export function isAnswered(answer: QuizAnswer | undefined): boolean {
  if (!answer) return false;
  if (answer.selectedOptionIds && answer.selectedOptionIds.length > 0) {
    return true;
  }
  return typeof answer.text === 'string' && answer.text.trim().length > 0;
}

export type AnswerMap = Readonly<Record<string, QuizAnswer>>;

export function toAnswerMap(answers: readonly QuizAnswer[]): AnswerMap {
  const map: Record<string, QuizAnswer> = {};
  for (const answer of answers) map[answer.questionId] = answer;
  return map;
}

/** Answers in the session's question order, blanks omitted — the wire shape. */
export function toAnswerList(
  questions: readonly QuizSessionQuestion[],
  answers: AnswerMap
): QuizAnswer[] {
  const list: QuizAnswer[] = [];
  for (const question of questions) {
    const answer = answers[question.id];
    if (isAnswered(answer)) list.push(answer as QuizAnswer);
  }
  return list;
}

export function answeredCount(
  questions: readonly QuizSessionQuestion[],
  answers: AnswerMap
): number {
  return questions.reduce(
    (count, question) => count + (isAnswered(answers[question.id]) ? 1 : 0),
    0
  );
}

export function unansweredQuestionNumbers(
  questions: readonly QuizSessionQuestion[],
  answers: AnswerMap
): number[] {
  const numbers: number[] = [];
  questions.forEach((question, index) => {
    if (!isAnswered(answers[question.id])) numbers.push(index + 1);
  });
  return numbers;
}

/**
 * The layout to use: the author's choice, except that `all_questions`
 * becomes one-per-page on a narrow viewport where a long scroll of
 * radio groups is harder to keep one's place in than a paged one.
 */
export function effectiveLayout(
  layout: QuizLayout,
  viewportWidth: number
): QuizLayout {
  if (layout === 'one_per_page') return 'one_per_page';
  return viewportWidth < ONE_PER_PAGE_MAX_WIDTH
    ? 'one_per_page'
    : 'all_questions';
}

/** Whether the integrity layer records anything for this attempt. */
export function integrityActive(settings: QuizAttemptSettings): boolean {
  return settings.integrityMode !== 'off';
}

/** Whether the learner is TOLD about violations (monitor mode records silently). */
export function integrityWarns(settings: QuizAttemptSettings): boolean {
  return (
    settings.integrityMode === 'warn' || settings.integrityMode === 'strict'
  );
}

/**
 * What the intro screen lists before Start. Kept as data so the same
 * facts render identically in the intro card and the tests.
 */
export interface AttemptFacts {
  readonly timeLimitSeconds: number | null;
  readonly attemptsUsed: number;
  readonly attemptsAllowed: number | null;
  readonly attemptsLeft: number | null;
}

export function attemptFacts(
  session: Pick<QuizAttemptSession, 'attemptsUsed' | 'attemptsAllowed'>,
  timeLimitSeconds: number | null
): AttemptFacts {
  const attemptsLeft =
    session.attemptsAllowed === null
      ? null
      : Math.max(0, session.attemptsAllowed - session.attemptsUsed);
  return {
    timeLimitSeconds,
    attemptsUsed: session.attemptsUsed,
    attemptsAllowed: session.attemptsAllowed,
    attemptsLeft,
  };
}

/** Two answers are the same when their selections (order-insensitive) and text match. */
export function answersEqual(
  a: QuizAnswer | undefined,
  b: QuizAnswer | undefined
): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  const aIds = [...(a.selectedOptionIds ?? [])].sort().join(' ');
  const bIds = [...(b.selectedOptionIds ?? [])].sort().join(' ');
  return aIds === bIds && (a.text ?? '') === (b.text ?? '');
}
