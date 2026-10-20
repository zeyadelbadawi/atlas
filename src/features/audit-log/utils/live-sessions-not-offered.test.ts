/**
 * Live classes are not part of the product: an Academy owner's activity
 * filter does not offer "Live sessions", and the learner's notifications
 * page and course progress copy do not promise them (EN + AR). Recorded
 * live-session entries keep their category and sentence, so stored data
 * still reads correctly, and the operator's platform log keeps the filter.
 */
import { describe, expect, it } from 'vitest';
import enLearning from '@/localization/resources/en/learning.json';
import arLearning from '@/localization/resources/ar/learning.json';
import enAudit from '@/localization/resources/en/auditLog.json';
import arAudit from '@/localization/resources/ar/auditLog.json';
import {
  AUDIT_ACTION_CATEGORIES,
  AUDIT_CATEGORIES,
  TENANT_AUDIT_CATEGORIES,
} from './audit-event-catalog';

describe('live sessions are not offered', () => {
  it('the academy activity filter has no "Live sessions" choice', () => {
    expect(TENANT_AUDIT_CATEGORIES).not.toContain('live_sessions');
    // Everything else an owner had is still there.
    expect(TENANT_AUDIT_CATEGORIES).toEqual(
      AUDIT_CATEGORIES.filter(
        (category) =>
          !['live_sessions', 'security', 'platform'].includes(category)
      )
    );
  });

  it('recorded live-session entries still have their category and label', () => {
    expect(AUDIT_CATEGORIES).toContain('live_sessions');
    expect(AUDIT_ACTION_CATEGORIES['live_session.created']).toBe(
      'live_sessions'
    );
    expect(enAudit.categories.live_sessions).toBeTruthy();
    expect(arAudit.categories.live_sessions).toBeTruthy();
  });

  it('the learner notifications subtitle and progress copy do not mention them', () => {
    const copy = [
      enLearning.learnerDashboard.notifications.subtitle,
      enLearning.learnerDashboard.courseProgress.empty.description,
    ];
    for (const text of copy) expect(text).not.toMatch(/live/i);
    const arCopy = [
      arLearning.learnerDashboard.notifications.subtitle,
      arLearning.learnerDashboard.courseProgress.empty.description,
    ];
    for (const text of arCopy) expect(text).not.toMatch(/مباشر/);
  });
});
