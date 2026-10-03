/**
 * Task 3 — `formatAuditEntry` turns structured audit rows into sentences a
 * person can read, in English and Arabic.
 *
 * Pinned here:
 *   - EVERY catalogue action has a base sentence in BOTH languages (adding
 *     an action without copy fails this file, not production);
 *   - richer variants are chosen only when their context is present
 *     ("…in the unit “Reactions”"), and degrade cleanly when it is not;
 *   - unknown actions get a target-aware fallback, never "made a change";
 *   - Atlas staff render as "Atlas", a nameless actor as "Someone";
 *   - before/after values are humanised (enums, booleans, redaction
 *     markers, localized text) and detail lines summarise section/question
 *     counts and configuration areas.
 */
import { describe, expect, it } from 'vitest';
import { createI18nInstance } from '@/localization/i18n';
import en from '@/localization/resources/en/auditLog.json';
import ar from '@/localization/resources/ar/auditLog.json';
import { AUDIT_ACTIONS, AUDIT_CATEGORIES } from './audit-event-catalog';
import { formatAuditEntry, humanizeKey } from './formatAuditEntry';

const enI18n = createI18nInstance('en');
const arI18n = createI18nInstance('ar');

function resource(bundle: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node && typeof node === 'object'
          ? (node as Record<string, unknown>)[key]
          : undefined,
      bundle
    );
}

describe('audit sentence coverage', () => {
  it.each(AUDIT_ACTIONS)(
    '%s has an English and an Arabic sentence',
    (action) => {
      expect(typeof resource(en, `events.${action}`)).toBe('string');
      expect(typeof resource(ar, `events.${action}`)).toBe('string');
    }
  );

  it('labels every category in both languages', () => {
    for (const category of [...AUDIT_CATEGORIES, 'other']) {
      expect(typeof resource(en, `categories.${category}`)).toBe('string');
      expect(typeof resource(ar, `categories.${category}`)).toBe('string');
    }
  });

  it('never renders a raw dotted action or a leftover placeholder for a known action', () => {
    for (const action of AUDIT_ACTIONS) {
      for (const i18n of [enI18n, arI18n]) {
        const { sentence } = formatAuditEntry(
          {
            action,
            actorName: 'Sara',
            targetLabel: 'Item',
            targetType: 'course',
          },
          i18n
        );
        expect(sentence).not.toContain(action);
        expect(sentence).not.toMatch(/{{|}}/);
        expect(sentence.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('formatAuditEntry — sentences', () => {
  const lesson = {
    action: 'course_lesson.created',
    actorName: 'محمد',
    targetType: 'course_lesson',
    targetLabel: 'مقدمة في الكيمياء',
    context: { courseId: 'c1', sectionId: 's1', sectionTitle: 'التفاعلات' },
  };

  it('Arabic: names the lesson and its unit', () => {
    expect(formatAuditEntry(lesson, arI18n).sentence).toBe(
      'محمد أنشأ درسًا بعنوان «مقدمة في الكيمياء» داخل وحدة «التفاعلات»'
    );
  });

  it('English: names the lesson and its unit', () => {
    expect(
      formatAuditEntry(
        {
          ...lesson,
          actorName: 'Sara',
          targetLabel: 'Intro to Chemistry',
          context: { sectionTitle: 'Reactions' },
        },
        enI18n
      ).sentence
    ).toBe(
      'Sara created the lesson “Intro to Chemistry” in the unit “Reactions”'
    );
  });

  it('falls back to the base sentence when the unit is unknown', () => {
    expect(
      formatAuditEntry({ ...lesson, actorName: 'Sara', context: {} }, enI18n)
        .sentence
    ).toBe('Sara created the lesson “مقدمة في الكيمياء”');
  });

  it('uses the richest variant whose context is complete', () => {
    const entry = {
      action: 'enrollment.granted',
      actorName: 'Owner',
      targetLabel: 'Chemistry 101',
      context: { studentName: 'Lina', courseTitle: 'Chemistry 101' },
    };
    expect(formatAuditEntry(entry, enI18n).sentence).toBe(
      'Owner enrolled Lina in the course “Chemistry 101”'
    );
    expect(formatAuditEntry(entry, arI18n).sentence).toBe(
      'Owner سجّل Lina في الدورة «Chemistry 101»'
    );
    expect(
      formatAuditEntry(
        { ...entry, context: { courseTitle: 'Chemistry 101' } },
        enI18n
      ).sentence
    ).toBe('Owner enrolled a student in the course “Chemistry 101”');
  });

  it('shows Atlas staff as Atlas, and a nameless actor as Someone', () => {
    const release = {
      action: 'website.published',
      actorName: 'Real Operator',
      actorIsPlatformStaff: true,
    };
    expect(formatAuditEntry(release, enI18n).sentence).toBe(
      'Atlas published the website'
    );
    expect(formatAuditEntry(release, arI18n).sentence).toBe('أطلس نشر الموقع');
    expect(
      formatAuditEntry({ action: 'website.published', actorName: '  ' }, enI18n)
        .actorLabel
    ).toBe('Someone');
  });

  it('names the provider for gateway events', () => {
    expect(
      formatAuditEntry(
        {
          action: 'organization.payment_gateway.enabled',
          actorName: 'Owner',
          context: { providerKey: 'zoom' },
        },
        enI18n
      ).sentence
    ).toBe('Owner turned on the payment gateway Zoom');
  });

  it('is target-aware for an action this build does not know', () => {
    expect(
      formatAuditEntry(
        {
          action: 'future.thing_happened',
          actorName: 'Sara',
          targetType: 'website_page',
          targetLabel: 'Pricing',
        },
        enI18n
      ).sentence
    ).toBe('Sara changed the page “Pricing”');
    expect(
      formatAuditEntry(
        {
          action: 'future.thing_happened',
          actorName: 'سارة',
          targetType: 'course',
        },
        arI18n
      ).sentence
    ).toBe('سارة غيّر دورة');
    expect(
      formatAuditEntry(
        { action: 'future.thing', actorName: 'Sara', category: 'website' },
        enI18n
      ).sentence
    ).toBe('Sara made a change in Website');
  });
});

describe('formatAuditEntry — details and changes', () => {
  it('humanises before/after values', () => {
    const { changes } = formatAuditEntry(
      {
        action: 'course.updated',
        actorName: 'Sara',
        targetLabel: 'Chemistry',
        changes: {
          title: { from: 'Old', to: 'New' },
          visibility: { from: 'private', to: 'public' },
          status: { from: 'draft', to: 'published' },
          requireFullscreen: { from: false, to: true },
          contactEmail: { from: '[email hidden]', to: '[email hidden]' },
          passwordHash: { from: '[redacted]', to: '[redacted]' },
          outcomes: { from: [], to: ['Balance equations', 'Name compounds'] },
          question: {
            from: { en: 'Old?', ar: 'قديم؟' },
            to: { en: 'New?', ar: 'جديد؟' },
          },
          someNewField: { from: null, to: 3 },
        },
      },
      enI18n
    );
    const byField = Object.fromEntries(
      changes.map((change) => [change.field, change])
    );
    expect(byField.title).toMatchObject({
      label: 'Title',
      from: 'Old',
      to: 'New',
    });
    expect(byField.visibility).toMatchObject({ from: 'Private', to: 'Public' });
    expect(byField.status).toMatchObject({ from: 'Draft', to: 'Published' });
    expect(byField.requireFullscreen).toMatchObject({ from: 'No', to: 'Yes' });
    expect(byField.contactEmail.to).toBe('Email address hidden');
    expect(byField.passwordHash.to).toBe('Hidden for security');
    expect(byField.outcomes).toMatchObject({
      from: '—',
      to: 'Balance equations, Name compounds',
    });
    expect(byField.question).toMatchObject({ from: 'Old?', to: 'New?' });
    expect(byField.someNewField).toMatchObject({
      label: 'Some new field',
      from: '—',
      to: '3',
    });
  });

  it('picks the Arabic side of localized text in Arabic', () => {
    const { changes } = formatAuditEntry(
      {
        action: 'website_faq.updated',
        actorName: 'سارة',
        targetLabel: 'Old?',
        changes: {
          question: {
            from: { en: 'Old?', ar: 'قديم؟' },
            to: { en: 'New?', ar: 'جديد؟' },
          },
        },
      },
      arI18n
    );
    expect(changes[0]).toMatchObject({
      label: 'السؤال',
      from: 'قديم؟',
      to: 'جديد؟',
    });
  });

  it('summarises section and question counts and configuration areas', () => {
    const page = formatAuditEntry(
      {
        action: 'website_page.updated',
        actorName: 'Sara',
        targetLabel: 'Home',
        context: {
          sectionsAdded: 2,
          sectionsRemoved: 0,
          sectionsUpdated: 1,
          sectionCount: 6,
        },
      },
      enI18n
    );
    expect(page.details).toContain(
      'Sections: 2 added, 0 removed, 1 edited (6 on the page).'
    );

    const quiz = formatAuditEntry(
      {
        action: 'quiz.updated',
        actorName: 'Sara',
        targetLabel: 'Quiz 1',
        context: {
          questionsAdded: 1,
          questionsRemoved: 0,
          questionsChanged: 2,
          questionCount: 9,
        },
      },
      arI18n
    );
    expect(quiz.details).toContain(
      'الأسئلة: أُضيف 1، وحُذف 0، وتغيّر 2 (9 إجمالًا).'
    );

    const config = formatAuditEntry(
      {
        action: 'website.configuration.updated',
        actorName: 'Sara',
        context: { changedAreas: 'brand,navigation' },
      },
      enI18n
    );
    expect(config.details).toContain(
      'Changed: colours and fonts, navigation menu.'
    );
  });

  it('lists changed field names when only names (not values) are known', () => {
    const { details } = formatAuditEntry(
      {
        action: 'course.updated',
        actorName: 'Sara',
        targetLabel: 'Chemistry',
        changedFields: ['title', 'pricingType'],
      },
      enI18n
    );
    expect(details).toContain('Changed: Title, Pricing.');
  });

  it('humanizes unknown keys', () => {
    expect(humanizeKey('pricingAmountMinorUnits')).toBe(
      'Pricing amount minor units'
    );
    expect(humanizeKey('grace_ends_at')).toBe('Grace ends at');
  });
});
