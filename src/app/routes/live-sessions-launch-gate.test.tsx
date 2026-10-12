/**
 * B0-LIV-01 — while the customer Live Sessions launch is off, its pages
 * (reachable by URL although the sidebar hides them) land on the add-ons
 * catalog instead of rendering.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { FEATURE_FLAGS } from '@config';
import { LiveSessionsLaunchGate } from './LiveSessionsLaunchGate';
import { DASHBOARD_ROUTES } from './route-paths';

afterEach(cleanup);

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe('LiveSessionsLaunchGate', () => {
  it('is off in this build', () => {
    expect(FEATURE_FLAGS.liveSessions).toBe(false);
  });

  it.each([
    DASHBOARD_ROUTES.liveSessions,
    DASHBOARD_ROUTES.liveSessionsList,
    DASHBOARD_ROUTES.liveSessionsRecordings,
    DASHBOARD_ROUTES.liveSessionsSettings,
  ])('sends %s to the add-ons catalog', (path) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path={path}
            element={
              <LiveSessionsLaunchGate>
                <p>live sessions page</p>
              </LiveSessionsLaunchGate>
            }
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.queryByText('live sessions page')).toBeNull();
    expect(screen.getByTestId('where').textContent).toBe(
      DASHBOARD_ROUTES.tenantAddOns
    );
  });
});
