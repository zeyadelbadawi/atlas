/**
 * The website section's sibling tabs offer Messages (the Contact form
 * inbox) only to someone who manages the website — the same
 * `academy.website.manage` gate as the sidebar entry and the route.
 */
import { describe, expect, it } from 'vitest';
import { getWebsiteTabs } from './utils/website-navigation.utils';

describe('getWebsiteTabs', () => {
  it('adds the Messages tab for a website manager', () => {
    const tabs = getWebsiteTabs('academy-1', { canManage: true });
    const messages = tabs.find((tab) => tab.id === 'website-tab-messages');
    expect(messages?.path).toBe(
      '/dashboard/academy/academy-1/website/messages'
    );
    expect(messages?.labelKey).toBe('website:messages.title');
  });

  it('leaves it out otherwise, keeping every other tab', () => {
    const ids = getWebsiteTabs('academy-1').map((tab) => tab.id);
    expect(ids).not.toContain('website-tab-messages');
    expect(ids).toEqual([
      'website-tab-overview',
      'website-tab-pages',
      'website-tab-content',
      'website-tab-settings',
      'website-tab-preview',
    ]);
  });
});
