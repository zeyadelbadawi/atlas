/**
 * The student curriculum nav renders a unit's UNIFIED sequence (P52) — one
 * ordered list mixing lessons, quizzes and assignments — never separate
 * per-type lists. Order comes from the server's `items`; each type links to
 * its own page. Falls back to a lessons-only projection when `items` is
 * absent (backward compatibility).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import {
  DASHBOARD_LEARNING_PATHS,
  LearningPathsProvider,
} from '../context/LearningPaths.context';
import { CurriculumNav } from './CurriculumNav';
import type { CourseSection, CurriculumItem, LessonProgressStatus } from '@types';

function renderNav(section: CourseSection, language = 'en') {
  const i18n = createI18nInstance(language as 'en' | 'ar');
  const statuses = new Map<string, LessonProgressStatus>();
  return render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>
        <LearningPathsProvider paths={DASHBOARD_LEARNING_PATHS}>
          <CurriculumNav
            courseId="c1"
            sections={[section]}
            lessonStatusById={statuses}
          />
        </LearningPathsProvider>
      </MemoryRouter>
    </I18nextProvider>,
  );
}

const item = (over: Partial<CurriculumItem>): CurriculumItem => ({
  id: 'x',
  type: 'lesson',
  title: 'X',
  order: 0,
  status: 'published',
  sectionId: 's1',
  ...over,
});

const section = (items?: CurriculumItem[]): CourseSection => ({
  id: 's1',
  courseId: 'c1',
  title: 'Unit 1',
  order: 0,
  lessons: [
    {
      id: 'l1',
      courseId: 'c1',
      sectionId: 's1',
      title: 'Intro Lesson',
      order: 0,
      contentType: 'text',
      status: 'published',
      createdAt: '',
      updatedAt: '',
    },
  ],
  items,
  createdAt: '',
  updatedAt: '',
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CurriculumNav — unified sequence', () => {
  it('renders lessons, quizzes and assignments in one ordered list with correct links', () => {
    renderNav(
      section([
        item({ id: 'q1', type: 'quiz', title: 'Chapter Quiz', order: 0 }),
        item({ id: 'l1', type: 'lesson', title: 'Intro Lesson', order: 1 }),
        item({ id: 'a1', type: 'assignment', title: 'Homework', order: 2 }),
      ]),
    );

    const links = screen.getAllByRole('link');
    // Order preserved: quiz, lesson, assignment.
    expect(links.map((l) => l.textContent?.trim())).toEqual([
      'Chapter Quiz',
      'Intro Lesson',
      'Homework',
    ]);
    expect(links[0].getAttribute('href')).toContain('/quizzes/q1');
    expect(links[1].getAttribute('href')).toContain('/learn/l1');
    expect(links[2].getAttribute('href')).toContain('/assignments/a1');
  });

  it('falls back to lessons when the server sends no unified items', () => {
    renderNav(section(undefined));
    const nav = screen.getByRole('navigation');
    expect(within(nav).getByText('Intro Lesson')).toBeTruthy();
  });

  it('renders in Arabic with no raw keys', () => {
    const { container } = renderNav(
      section([item({ id: 'q1', type: 'quiz', title: 'اختبار', order: 0 })]),
      'ar',
    );
    expect(container.textContent).not.toMatch(/learning:|course:/);
    expect(container.textContent).toMatch(/[؀-ۿ]/);
  });
});
