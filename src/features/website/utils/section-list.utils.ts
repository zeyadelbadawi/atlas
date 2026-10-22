/**
 * The edits an author makes to a page's list of sections, as pure
 * functions over the list — shared by the page editor and the visual
 * editor, so "duplicate", "move" or "add" mean exactly the same in both.
 * Each returns a new list (or the same one when nothing changes).
 */
import { DEFAULT_RESPONSIVE_VISIBILITY } from '@types';
import type {
  ResponsiveVisibility,
  SectionConfigMap,
  SectionInstance,
  SectionType,
} from '@types';
import { getDefaultSectionConfig } from '../sections/section-metadata.registry';

type Sections = readonly SectionInstance[];

export function toggleSectionEnabled(
  sections: Sections,
  id: string
): SectionInstance[] {
  return sections.map((section) =>
    section.id === id ? { ...section, enabled: !section.enabled } : section
  );
}

export function toggleSectionVisibility(
  sections: Sections,
  id: string,
  breakpoint: keyof ResponsiveVisibility
): SectionInstance[] {
  return sections.map((section) =>
    section.id === id
      ? {
          ...section,
          visibility: {
            ...section.visibility,
            [breakpoint]: !section.visibility[breakpoint],
          },
        }
      : section
  );
}

/** Swaps the section at `index` with its neighbour above (-1) or below (1). */
export function moveSection(
  sections: Sections,
  index: number,
  direction: -1 | 1
): SectionInstance[] {
  const target = index + direction;
  if (target < 0 || target >= sections.length) return [...sections];
  const next = [...sections];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Moves the section at `from` to position `to` (drag and drop). */
export function moveSectionTo(
  sections: Sections,
  from: number,
  to: number
): SectionInstance[] {
  if (
    from === to ||
    from < 0 ||
    to < 0 ||
    from >= sections.length ||
    to >= sections.length
  ) {
    return [...sections];
  }
  const next = [...sections];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

/** A copy of the section right after it, with a new id. */
export function duplicateSection(
  sections: Sections,
  id: string,
  newId: string = crypto.randomUUID()
): { readonly sections: SectionInstance[]; readonly id?: string } {
  const index = sections.findIndex((section) => section.id === id);
  if (index === -1) return { sections: [...sections] };
  const next = [...sections];
  next.splice(index + 1, 0, { ...sections[index], id: newId });
  return { sections: next, id: newId };
}

export function removeSection(
  sections: Sections,
  id: string
): SectionInstance[] {
  return sections.filter((section) => section.id !== id);
}

/** A new section of `type` with its default content, at `index` (the end by default). */
export function insertSection(
  sections: Sections,
  type: SectionType,
  index: number = sections.length,
  newId: string = crypto.randomUUID()
): { readonly sections: SectionInstance[]; readonly id: string } {
  const instance = {
    id: newId,
    type,
    enabled: true,
    visibility: DEFAULT_RESPONSIVE_VISIBILITY,
    config: getDefaultSectionConfig(type),
  } as SectionInstance;
  const next = [...sections];
  next.splice(Math.max(0, Math.min(index, next.length)), 0, instance);
  return { sections: next, id: newId };
}

export function replaceSectionConfig<TType extends SectionType>(
  sections: Sections,
  id: string,
  config: SectionConfigMap[TType] | SectionInstance['config']
): SectionInstance[] {
  return sections.map((section) =>
    section.id === id ? ({ ...section, config } as SectionInstance) : section
  );
}

/** A section with its design (CMS phase 3) replaced; `undefined` removes it. */
export function replaceSectionDesign(
  sections: Sections,
  id: string,
  design: SectionInstance['design']
): SectionInstance[] {
  return sections.map((section) => {
    if (section.id !== id) return section;
    const { design: _previous, ...rest } = section;
    return (design ? { ...rest, design } : rest) as SectionInstance;
  });
}
