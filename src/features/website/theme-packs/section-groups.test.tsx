/**
 * Section groups (`section-groups.tsx`): every phase 3d (and phase 3c
 * custom) renderer a pack names is a real export of its own theme's group,
 * and a page records the groups it draws, so the browser can load them
 * before hydrating.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, waitFor } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MODERN_EDUCATION_PACK } from '../modern-education/modern-education.pack';
import { ATELIER_PACK } from '../atelier/atelier.pack';
import { MANARA_PACK } from '../manara/manara.pack';
import { RIWAQ_PACK } from '../riwaq/riwaq.pack';
import { BASE_RENDERERS } from './base-renderers';
import {
  deferredSectionTarget,
  isSectionGroupKey,
  loadAllSectionGroups,
  loadedSectionGroup,
  SectionGroupUsageContext,
  type SectionGroupKey,
} from './section-groups';

const PHASE_3D_TYPES = [
  'logos',
  'map',
  'schedule',
  'results',
  'whatsappBar',
  'video',
  'pricing',
  'countdown',
  'interestForm',
  'announcementBar',
  'comparison',
  'timeline',
  'videoTestimonials',
  'downloads',
  'certificates',
  // CMS phase 3c.
  'custom',
] as const;

const PACKS = [MODERN_EDUCATION_PACK, ATELIER_PACK, MANARA_PACK, RIWAQ_PACK];

describe('section groups', () => {
  it('every pack defers each phase 3d section to an export of its own group', async () => {
    await loadAllSectionGroups();
    for (const pack of PACKS) {
      for (const type of PHASE_3D_TYPES) {
        const target = deferredSectionTarget(pack.renderers[type]);
        expect(target, `${pack.key} ${type}`).toBeDefined();
        expect(target!.group.startsWith(`${pack.key}:`)).toBe(true);
        expect(
          typeof loadedSectionGroup(target!.group)?.[target!.exportName],
          `${target!.group} exports ${target!.exportName}`
        ).toBe('function');
      }
    }
  });

  it('records the group a rendered section came from', async () => {
    await loadAllSectionGroups();
    const Announcement = RIWAQ_PACK.renderers.announcementBar!;
    const usage = new Set<SectionGroupKey>();
    renderToStaticMarkup(
      <SectionGroupUsageContext.Provider value={usage}>
        <Announcement
          academyId="a1"
          pages={[]}
          config={{ text: { en: 'Registration is open', ar: '' } } as never}
        />
      </SectionGroupUsageContext.Provider>
    );
    expect([...usage]).toEqual(['riwaq:enrol']);
  });

  it('the base renderer defers the custom section to a group of its own', async () => {
    await loadAllSectionGroups();
    const target = deferredSectionTarget(BASE_RENDERERS.custom);
    expect(target).toEqual({
      group: 'base:custom',
      exportName: 'CustomSection',
    });
    expect(typeof loadedSectionGroup('base:custom')?.CustomSection).toBe(
      'function'
    );
    for (const pack of PACKS) {
      expect(deferredSectionTarget(pack.renderers.custom)?.group).toBe(
        `${pack.key}:custom`
      );
    }
  });

  it('only knows the groups this build has', () => {
    expect(isSectionGroupKey('riwaq:engage')).toBe(true);
    expect(isSectionGroupKey('riwaq:nope')).toBe(false);
    expect(isSectionGroupKey('toString')).toBe(false);
  });
});

describe('a section group that cannot load', () => {
  it('keeps the room while loading, then gives it back', async () => {
    vi.resetModules();
    // A fresh copy of the registry, so no real group is replaced.
    const fresh = await import('./section-groups');
    let fail!: (error: Error) => void;
    const Section = fresh.sectionGroup(
      'riwaq:enrol',
      () =>
        new Promise((_, reject) => {
          fail = reject;
        })
    )('RiwaqAnnouncementBar');
    const { container } = render(
      <Section
        academyId="a1"
        pages={[]}
        config={{ text: { en: 'Open', ar: '' } } as never}
      />
    );
    expect(container.querySelector('[data-deferred-section]')).toBeTruthy();
    await act(async () => {
      fail(new Error('not a chunk error: no retries'));
    });
    await waitFor(() =>
      expect(container.querySelector('[data-deferred-section]')).toBeNull()
    );
  });
});
