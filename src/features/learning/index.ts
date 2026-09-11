/**
 * Student Learning feature — public entry point.
 */
export * from './pages';
export * from './components/CurriculumNav';
export * from './components/LearningLayout';
/**
 * Exported so the Academy website's learning routes can supply their own
 * navigation paths through the feature's public entry point instead of a
 * deep `@features/learning/context/...` import. That deep import previously
 * had no alternative: the barrel transitively pulled in `LearningLayout`,
 * which imported `@features/public-website`, so a public-website consumer
 * importing the barrel closed a cycle. The shared data hooks have since
 * moved to `@hooks`/`@services`, `LearningLayout` no longer depends on
 * `@features/public-website`, and the cycle is gone.
 */
export * from './context/LearningPaths.context';
export * from './hooks';
export * from './services/EnrollmentService';
export * from './services/ProgressService';
export * from './services/QuizService';
export * from './services/AssignmentService';
export * from './schemas/learning.schemas';
export * from './schemas/quiz-authoring.schemas';
export * from './schemas/assignment-authoring.schemas';
export * from './constants/learning.constants';
export * from './utils/learning-status.utils';
