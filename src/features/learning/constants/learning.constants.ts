/**
 * Student Learning constants.
 */

/** Maximum assignment response length. */
export const MAX_ASSIGNMENT_RESPONSE_LENGTH = 5000;

/** Assignment attachment maximum file size (10MB). */
export const MAX_ASSIGNMENT_ATTACHMENT_FILE_SIZE = 10 * 1024 * 1024;

/** Allowed assignment attachment file types. */
export const ALLOWED_ASSIGNMENT_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Phase 4 — Quiz/Assignment authoring validation constants. Mirrors `atlas backend/src/learning/dto/learning.constants.ts` exactly. */
export const MAX_QUIZ_TITLE_LENGTH = 150;
export const MAX_QUIZ_DESCRIPTION_LENGTH = 2000;
export const MAX_QUIZ_QUESTION_PROMPT_LENGTH = 1000;
export const MAX_QUIZ_OPTION_LABEL_LENGTH = 300;
/** At least one question — an empty quiz is never a real, takeable quiz. */
export const MIN_QUIZ_QUESTIONS = 1;
export const MAX_QUIZ_QUESTIONS = 100;
export const MAX_QUIZ_OPTIONS_PER_QUESTION = 10;

export const MAX_ASSIGNMENT_TITLE_LENGTH = 150;
export const MAX_ASSIGNMENT_DESCRIPTION_LENGTH = 2000;
export const MAX_ASSIGNMENT_INSTRUCTIONS_LENGTH = 5000;
