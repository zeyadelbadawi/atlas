/**
 * Academy and organization names are user content in their own script. In
 * the Arabic (RTL) dashboard an English name must keep its beginning and be
 * cut at its END by the ellipsis — so every truncated name in the two
 * switchers carries `dir="auto"` (its own direction, isolated from the
 * page's) and the full name as a tooltip.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';

// jsdom has no ResizeObserver or scrollIntoView; cmdk's list uses both.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe(): void {}
      unobserve(): void {}
      disconnect(): void {}
    };
}
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => undefined;
}

const LONG_LATIN = 'Very Long International Data Science Academy Of Cairo';
const OTHER = 'أكاديمية النيل للتعليم المستمر';
const ORG_NAME = 'Nile Learning Group International Holdings';

vi.mock('../hooks/useAcademies', () => ({
  useAcademies: () => ({
    data: {
      items: [
        { id: 'a1', name: LONG_LATIN, status: 'active', viewerRole: 'owner' },
        { id: 'a2', name: OTHER, status: 'active', viewerRole: 'manager' },
      ],
    },
  }),
}));
vi.mock('../hooks/useSwitchAcademy', () => ({
  useSwitchAcademy: () => ({ switchAcademy: vi.fn() }),
}));
vi.mock('../scope/academy-scope.context', () => ({
  useAcademyScope: () => ({
    academyId: undefined,
    membership: undefined,
    lostAcademyIds: new Set<string>(),
  }),
}));
vi.mock('@hooks', () => ({
  usePlatform: () => ({ activeAcademyId: 'a1' }),
  useAuth: () => ({
    user: {
      id: 'u1',
      organizations: [
        { organizationId: 'o1', organizationName: ORG_NAME },
        { organizationId: 'o2', organizationName: 'منظمة أخرى' },
      ],
    },
    organization: { id: 'o1', name: ORG_NAME },
    switchOrganization: vi.fn(),
  }),
}));

import { AcademySwitcher } from './AcademySwitcher';
import { OrganizationSwitcher } from '@/shared/components/controls/OrganizationSwitcher';

function renderAr(ui: JSX.Element) {
  document.documentElement.setAttribute('dir', 'rtl');
  return render(
    <I18nextProvider i18n={createI18nInstance('ar')}>
      <div dir="rtl">{ui}</div>
    </I18nextProvider>
  );
}

afterEach(() => cleanup());

describe('switcher names keep their own direction (RTL truncation)', () => {
  it('academy switcher: the current name and every listed name are dir="auto" with the full name as a tooltip', async () => {
    renderAr(<AcademySwitcher />);
    const current = screen.getByTestId('academy-switcher-current');
    expect(current.getAttribute('dir')).toBe('auto');
    expect(current.getAttribute('title')).toBe(LONG_LATIN);
    expect(current.className).toContain('truncate');

    await userEvent.click(screen.getByTestId('academy-switcher'));
    for (const [id, name] of [
      ['a1', LONG_LATIN],
      ['a2', OTHER],
    ] as const) {
      const option = await screen.findByTestId(`academy-switcher-option-${id}`);
      const label = within(option).getByText(name);
      expect(label.getAttribute('dir')).toBe('auto');
      expect(label.getAttribute('title')).toBe(name);
    }
  });

  it('organization switcher: the active name and the menu names are dir="auto"', async () => {
    renderAr(<OrganizationSwitcher />);
    const active = screen.getByText(ORG_NAME);
    expect(active.getAttribute('dir')).toBe('auto');
    expect(active.getAttribute('title')).toBe(ORG_NAME);

    await userEvent.click(screen.getByRole('button'));
    const items = await screen.findAllByRole('menuitem');
    for (const item of items) {
      const label = item.querySelector('span[dir="auto"]');
      expect(label).not.toBeNull();
      expect(label?.getAttribute('title')).toBe(label?.textContent);
    }
  });
});
