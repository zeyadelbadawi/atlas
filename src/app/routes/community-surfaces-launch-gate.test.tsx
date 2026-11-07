/**
 * B0-WEB-07 — while the academy blog and course forum are off, their pages
 * (reachable by URL although every menu hides them) do not render: a forum
 * URL lands on its course's overview, a blog URL on the dashboard home.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FEATURE_FLAGS } from '@config';
import { CommunitySurfacesLaunchGate } from './CommunitySurfacesLaunchGate';
import { DASHBOARD_ROUTES } from './route-paths';

afterEach(cleanup);

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderAt(pattern: string, url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path={pattern}
          element={
            <CommunitySurfacesLaunchGate>
              <p>community page</p>
            </CommunitySurfacesLaunchGate>
          }
        />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CommunitySurfacesLaunchGate', () => {
  it('is off in this build', () => {
    expect(FEATURE_FLAGS.academyBlogAndForum).toBe(false);
  });

  it.each([
    [DASHBOARD_ROUTES.blog, '/dashboard/blog'],
    [DASHBOARD_ROUTES.blogCreate, '/dashboard/blog/create'],
    [DASHBOARD_ROUTES.blogPost, '/dashboard/blog/p-1'],
    [DASHBOARD_ROUTES.blogEdit, '/dashboard/blog/p-1/edit'],
  ])('sends the blog page %s to the dashboard home', (pattern, url) => {
    renderAt(pattern, url);
    expect(screen.queryByText('community page')).toBeNull();
    expect(screen.getByTestId('where').textContent).toBe(DASHBOARD_ROUTES.root);
  });

  it.each([
    [
      DASHBOARD_ROUTES.instructorDiscussions,
      '/dashboard/instructor/courses/c-42/discussions',
    ],
    [
      DASHBOARD_ROUTES.instructorThread,
      DASHBOARD_ROUTES.instructorThread
        .replace(':courseId', 'c-42')
        .replace(':threadId', 't-7'),
    ],
  ])('sends the forum page %s to its course overview', (pattern, url) => {
    renderAt(pattern, url);
    expect(screen.queryByText('community page')).toBeNull();
    expect(screen.getByTestId('where').textContent).toBe(
      '/dashboard/instructor/courses/c-42'
    );
  });
});
