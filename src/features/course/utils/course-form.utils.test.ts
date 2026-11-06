/**
 * B3 (UX audit) — V22 content links are http(s) only; V03 a one-per-line
 * list names the line that is too long and counts only filled lines.
 */
import { describe, expect, it } from 'vitest';
import { isHttpUrl, linesListSchema } from './course-form.utils';
import { courseLessonSchema } from '../schemas/course.schemas';

describe('isHttpUrl (V22)', () => {
  it.each(['https://youtu.be/abc', 'http://example.com/file.pdf', ''])(
    'accepts %j',
    (value) => expect(isHttpUrl(value)).toBe(true)
  );
  it.each([
    'javascript:alert(1)',
    'data:text/html,<b>x</b>',
    'file:///etc/passwd',
    'ftp://example.com',
    'not a url',
  ])('refuses %j', (value) => expect(isHttpUrl(value)).toBe(false));

  it('the lesson schema refuses a javascript: link with its own message', () => {
    const result = courseLessonSchema.safeParse({
      title: 'Intro',
      contentType: 'file',
      contentUrl: 'javascript:alert(1)',
      status: 'draft',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({
      path: ['contentUrl'],
      message: 'course:builder.lessonDialog.invalidContentUrl',
    });
  });
});

describe('linesListSchema (V03)', () => {
  const schema = linesListSchema(20, 300);

  it('names the too-long line by its number, length and limit', () => {
    const lines = ['First', '', 'Third', 'x'.repeat(320)];
    const result = schema.safeParse(lines);
    expect(result.error?.issues[0].message).toBe(
      'course:validation.lineTooLong|{"line":4,"length":320,"max":300}'
    );
  });

  it('counts only filled lines against the item limit', () => {
    const twentyWithBlanks = [
      ...Array.from({ length: 20 }, (_, i) => `Item ${i}`),
      '',
      '  ',
    ];
    expect(schema.safeParse(twentyWithBlanks).success).toBe(true);
    const twentyTwo = Array.from({ length: 22 }, (_, i) => `Item ${i}`);
    expect(schema.safeParse(twentyTwo).error?.issues[0].message).toBe(
      'course:validation.tooManyLines|{"count":22,"max":20}'
    );
  });
});
