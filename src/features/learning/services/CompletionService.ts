/**
 * Completion Service (P64 Phase 3, AD-11).
 *
 * Two surfaces over one rule. The learner reads the evaluated state of
 * their own enrollment (`/learning/courses/:courseId/completion`); the
 * academy's owner or manager reads and writes the rule itself
 * (`/academies/:id/courses/:courseId/completion-rule`). Neither call
 * computes anything here — the evaluator is server-side and re-runs after
 * every progress, quiz result or grading write.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import { resourcePath } from '@api';
import type {
  CourseCompletion,
  CourseCompletionRule,
  UpdateCompletionRulePayload,
} from '@types';

export class CompletionService extends BaseService {
  protected readonly resource = 'learning';

  /** The learner's own completion screen for a course they are enrolled in. */
  async getCourseCompletion(
    courseId: string,
    options?: ReadOptions
  ): Promise<CourseCompletion> {
    return this.client.get<CourseCompletion>(
      this.path('courses', courseId, 'completion'),
      options
    );
  }

  /** Staff: the course's completion rule, its required items and its certificate settings. */
  async getCompletionRule(
    academyId: string,
    courseId: string,
    options?: ReadOptions
  ): Promise<CourseCompletionRule> {
    return this.client.get<CourseCompletionRule>(
      resourcePath(
        'academies',
        academyId,
        'courses',
        courseId,
        'completion-rule'
      ),
      options
    );
  }

  /** Staff (owner / manager): update the rule. Only the fields sent change. */
  async updateCompletionRule(
    academyId: string,
    courseId: string,
    payload: UpdateCompletionRulePayload,
    options?: WriteOptions
  ): Promise<CourseCompletionRule> {
    return this.client.put<CourseCompletionRule, UpdateCompletionRulePayload>(
      resourcePath(
        'academies',
        academyId,
        'courses',
        courseId,
        'completion-rule'
      ),
      payload,
      options
    );
  }
}

export const completionService = new CompletionService();
