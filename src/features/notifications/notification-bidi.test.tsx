/**
 * RTL sweep — a notification's title and message are translated sentences
 * built from stored values (a sender's name, a subject, a course title).
 * In Arabic they keep the page's direction (no `dir="auto"`, which a Latin
 * name at the start — "{{senderName}}: {{excerpt}}" — would turn
 * left-to-right) and every text value is bidi-isolated; numbers stay plain.
 * In English nothing changes.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import { createI18nInstance } from '@/localization/i18n';
import type { Notification } from '@types';
import { NotificationRow } from './components/NotificationList';

const iso = (value: string): string => `⁨${value}⁩`;

afterEach(cleanup);

const MESSAGE: Notification = {
  id: 'n-1',
  userId: 'u-1',
  type: 'activity',
  priority: 'medium',
  titleKey: 'notifications:events.academyMessageSent.title',
  messageKey: 'notifications:events.academyMessageSent.message',
  values: {
    subject: 'Week 3 schedule',
    senderName: 'Ziad Elbadawi',
    excerpt: 'See you Monday',
  },
  isRead: false,
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
} as Notification;

function renderRow(language: 'en' | 'ar', notification: Notification) {
  return render(
    <I18nextProvider i18n={createI18nInstance(language)}>
      <MemoryRouter>
        <ul>
          <NotificationRow notification={notification} onMarkRead={vi.fn()} />
        </ul>
      </MemoryRouter>
    </I18nextProvider>
  );
}

describe('notification sentences', () => {
  it('Arabic: values isolated, sentence in the page direction', () => {
    const { container } = renderRow('ar', MESSAGE);
    const message = screen.getByText(
      `${iso('Ziad Elbadawi')}: ${iso('See you Monday')}`
    );
    expect(message.hasAttribute('dir')).toBe(false);
    expect(container.querySelectorAll('[dir="auto"]')).toHaveLength(0);
    expect(container.textContent).toContain(iso('Week 3 schedule'));
  });

  it('Arabic: a number value is left as a number (no isolate)', () => {
    renderRow('ar', {
      ...MESSAGE,
      titleKey: 'notifications:events.quizGraded.title',
      messageKey: 'notifications:events.quizGraded.message',
      values: { quizTitle: 'Quiz 1', score: 80 },
    });
    expect(
      screen.getByText((_, el) =>
        Boolean(
          el?.tagName === 'P' &&
          el.textContent?.includes(`«${iso('Quiz 1')}»`) &&
          el.textContent.includes('80%')
        )
      )
    ).toBeTruthy();
  });

  it('English: unchanged — no isolate characters', () => {
    const { container } = renderRow('en', MESSAGE);
    expect(container.textContent).not.toMatch(/[⁨⁩]/);
    expect(container.textContent).toContain('Ziad Elbadawi: See you Monday');
  });
});
