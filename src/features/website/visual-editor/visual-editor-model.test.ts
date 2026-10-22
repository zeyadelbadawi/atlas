/**
 * The visual editor's model, without a browser: the section-list edits it
 * shares with the page editor, undo / redo, and what its autosave sends.
 */
import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useState } from 'react';
import type { SectionInstance } from '@types';
import {
  duplicateSection,
  insertSection,
  moveSection,
  moveSectionTo,
  removeSection,
  replaceSectionConfig,
  toggleSectionEnabled,
  toggleSectionVisibility,
} from '../utils/section-list.utils';
import { HISTORY_COALESCE_MS, useEditHistory } from './useEditHistory';
import { invalidSectionIds, parsedSections } from './section-validation';
import { getDefaultSectionConfig } from '../sections/section-metadata.registry';

function section(id: string, type: SectionInstance['type'] = 'about') {
  return {
    id,
    type,
    enabled: true,
    visibility: { desktop: true, tablet: true, mobile: true },
    config: getDefaultSectionConfig(type),
  } as SectionInstance;
}
const ids = (sections: readonly SectionInstance[]) =>
  sections.map((item) => item.id);

describe('section-list edits', () => {
  const list = [section('a'), section('b'), section('c')];

  it('moves by one, or to a position (drag and drop)', () => {
    expect(ids(moveSection(list, 1, -1))).toEqual(['b', 'a', 'c']);
    expect(ids(moveSection(list, 0, -1))).toEqual(['a', 'b', 'c']);
    expect(ids(moveSectionTo(list, 0, 2))).toEqual(['b', 'c', 'a']);
    expect(ids(moveSectionTo(list, 2, 0))).toEqual(['c', 'a', 'b']);
    expect(ids(moveSectionTo(list, 0, 9))).toEqual(['a', 'b', 'c']);
  });

  it('duplicates right after the original, with a new id', () => {
    const result = duplicateSection(list, 'b', 'b2');
    expect(ids(result.sections)).toEqual(['a', 'b', 'b2', 'c']);
    expect(result.id).toBe('b2');
    expect(result.sections[2].config).toEqual(list[1].config);
  });

  it('adds a section with its ready content where asked', () => {
    const result = insertSection(list, 'faq', 1, 'new');
    expect(ids(result.sections)).toEqual(['a', 'new', 'b', 'c']);
    expect(result.sections[1]).toMatchObject({
      type: 'faq',
      enabled: true,
      config: getDefaultSectionConfig('faq'),
    });
    expect(ids(insertSection(list, 'faq', undefined, 'end').sections)).toEqual([
      'a',
      'b',
      'c',
      'end',
    ]);
  });

  it('removes, hides, sets devices and replaces content without touching the rest', () => {
    expect(ids(removeSection(list, 'b'))).toEqual(['a', 'c']);
    expect(toggleSectionEnabled(list, 'a')[0].enabled).toBe(false);
    expect(toggleSectionVisibility(list, 'c', 'mobile')[2].visibility).toEqual({
      desktop: true,
      tablet: true,
      mobile: false,
    });
    const config = { ...list[0].config, title: { en: 'Hi', ar: '' } };
    const replaced = replaceSectionConfig(list, 'a', config);
    expect(replaced[0].config).toBe(config);
    expect(replaced[1]).toBe(list[1]);
  });
});

function useHarness(initial: SectionInstance[], clock: { now: number }) {
  const [sections, setSections] = useState(initial);
  const history = useEditHistory(sections, setSections, () => clock.now);
  return { sections, history };
}

describe('undo / redo', () => {
  const start = [section('a'), section('b')];

  it('undoes and redoes each change, and a new change clears redo', () => {
    const clock = { now: 0 };
    const { result } = renderHook(() => useHarness(start, clock));
    act(() => result.current.history.record(removeSection(start, 'b')));
    expect(ids(result.current.sections)).toEqual(['a']);
    expect(result.current.history.canUndo).toBe(true);

    act(() => result.current.history.undo());
    expect(ids(result.current.sections)).toEqual(['a', 'b']);
    expect(result.current.history.canRedo).toBe(true);
    const revision = result.current.history.revision;

    act(() => result.current.history.redo());
    expect(ids(result.current.sections)).toEqual(['a']);
    expect(result.current.history.revision).toBe(revision + 1);

    act(() => result.current.history.undo());
    act(() =>
      result.current.history.record(moveSection(result.current.sections, 1, -1))
    );
    expect(result.current.history.canRedo).toBe(false);
  });

  it('typing in one section is one step; a pause or another section starts a new one', () => {
    const clock = { now: 1_000 };
    const { result } = renderHook(() => useHarness(start, clock));
    const type = (text: string, id = 'a') =>
      act(() => {
        const current = result.current.sections;
        result.current.history.record(
          replaceSectionConfig(current, id, {
            ...current.find((item) => item.id === id)!.config,
            title: { en: text, ar: '' },
          }),
          `config:${id}`
        );
      });
    type('H');
    clock.now += 100;
    type('He');
    clock.now += 100;
    type('Hel');
    clock.now += HISTORY_COALESCE_MS + 1;
    type('Hello');

    act(() => result.current.history.undo());
    expect(
      (result.current.sections[0].config as { title: { en: string } }).title.en
    ).toBe('Hel');
    act(() => result.current.history.undo());
    expect(result.current.sections[0].config).toEqual(start[0].config);
    expect(result.current.history.canUndo).toBe(false);
  });

  it('a change that changes nothing is not a step', () => {
    const clock = { now: 0 };
    const { result } = renderHook(() => useHarness(start, clock));
    act(() => result.current.history.record([...start]));
    expect(result.current.history.canUndo).toBe(false);
  });
});

describe('what the autosave sends', () => {
  it('names a section the API would refuse, and sends each config as the API stores it', () => {
    const valid = section('ok', 'faq');
    const broken = {
      ...section('bad', 'faq'),
      config: { ...valid.config, items: 'not a list' },
    } as unknown as SectionInstance;
    expect([...invalidSectionIds([valid, broken], 'en')]).toEqual(['bad']);
    expect(invalidSectionIds([valid], 'en').size).toBe(0);
    const sent = parsedSections([valid], 'en');
    expect(sent[0].id).toBe('ok');
    expect(sent[0].config).toEqual(valid.config);
  });
});
