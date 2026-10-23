/**
 * Inline text editing's mapping from text on the canvas to a content field
 * (`inline-text.ts`): unique, ambiguous and missing matches, the Arabic
 * preview (including the English fallback of an empty Arabic side), list
 * items and button labels, and the plain-text edits typing makes.
 */
import { describe, expect, it } from 'vitest';
import type { SectionInstance } from '@types';
import {
  applyInlineInput,
  canEditInPlace,
  deletionRange,
  findInlineTextTarget,
  inlineTextCandidates,
  matchInlineText,
  setInlineText,
} from './inline-text';

const text = (en: string, ar = '') => ({ en, ar });

const hero = {
  type: 'hero',
  config: {
    eyebrow: text('New cohort', 'دفعة جديدة'),
    title: text('Learn new skills', 'تعلّم مهارات جديدة'),
    subtitle: text(''),
    description: text('Short pitch\nOn two lines', ''),
    imageAlt: text('Learn new skills'),
    highlight: text('one at a time', 'خطوة بخطوة'),
    showSearch: false,
    cta: { label: text('Explore courses', 'تصفح الدورات'), pageId: 'p1' },
    secondaryCta: { label: text('Talk to us', 'تحدث إلينا'), url: '/x' },
    highlights: [
      { id: 'h1', label: text('Live classes', 'حصص مباشرة') },
      { id: 'h2', label: text('Certificates', 'شهادات') },
    ],
  },
} as unknown as Pick<SectionInstance, 'type' | 'config'>;

const faq = {
  type: 'faq',
  config: {
    title: text('Questions'),
    cta: { label: text('Contact us') },
    items: [
      { id: 'q1', question: text('Is it free?'), answer: text('Yes') },
      { id: 'q2', question: text('Is it online?'), answer: text('Yes') },
    ],
  },
} as unknown as Pick<SectionInstance, 'type' | 'config'>;

describe('inlineTextCandidates', () => {
  it('lists the section text fields, list items and button labels that have text', () => {
    const paths = inlineTextCandidates(hero, 'modern-education', 'en').map(
      (candidate) => candidate.path.join('.')
    );
    expect(paths).toEqual([
      'eyebrow',
      'title',
      'description',
      'cta.label',
      'secondaryCta.label',
      'highlight',
      'highlights.0.label',
      'highlights.1.label',
    ]);
  });

  it('carries the limit, the line mode and the panel field of each', () => {
    const [eyebrow] = inlineTextCandidates(hero, 'modern-education', 'ar');
    expect(eyebrow).toMatchObject({
      locale: 'ar',
      shown: 'دفعة جديدة',
      editable: true,
      multiline: false,
      fieldId: 'section-field-eyebrow-ar',
    });
    expect(eyebrow?.maxLength).toBeGreaterThan(0);
    const description = inlineTextCandidates(
      hero,
      'modern-education',
      'en'
    ).find((candidate) => candidate.path[0] === 'description');
    expect(description?.multiline).toBe(true);
    const item = inlineTextCandidates(hero, 'modern-education', 'en').find(
      (candidate) => candidate.path.join('.') === 'highlights.1.label'
    );
    expect(item?.fieldId).toBe('section-field-highlights-1-label-en');
    const button = inlineTextCandidates(hero, 'modern-education', 'en').find(
      (candidate) => candidate.path.join('.') === 'secondaryCta.label'
    );
    expect(button?.fieldId).toBe('cta-label-secondaryCta-en');
  });
});

describe('matchInlineText', () => {
  const en = inlineTextCandidates(hero, 'modern-education', 'en');
  const ar = inlineTextCandidates(hero, 'modern-education', 'ar');

  it('a unique, exact match is editable', () => {
    const match = matchInlineText('  Learn new   skills ', en);
    expect(match.kind).toBe('editable');
    expect(match.kind === 'editable' && match.candidate.path).toEqual([
      'title',
    ]);
  });

  it('no match, or only a partial one, is none', () => {
    expect(matchInlineText('Learn new', en).kind).toBe('none');
    expect(matchInlineText('Something else', en).kind).toBe('none');
    expect(matchInlineText('   ', en).kind).toBe('none');
  });

  it('text two fields show is ambiguous', () => {
    const match = matchInlineText(
      'Yes',
      inlineTextCandidates(faq, 'modern-education', 'en')
    );
    expect(match.kind).toBe('ambiguous');
    expect(
      match.kind === 'ambiguous' &&
        match.candidates.map((candidate) => candidate.path.join('.'))
    ).toEqual(['items.0.answer', 'items.1.answer']);
  });

  it('list items and button labels match their own paths', () => {
    const item = matchInlineText(
      'Is it online?',
      inlineTextCandidates(faq, 'modern-education', 'en')
    );
    expect(item.kind === 'editable' && item.candidate.path).toEqual([
      'items',
      1,
      'question',
    ]);
    const button = matchInlineText(
      'Contact us',
      inlineTextCandidates(faq, 'modern-education', 'en')
    );
    expect(button.kind === 'editable' && button.candidate.path).toEqual([
      'cta',
      'label',
    ]);
  });

  it('matches the Arabic text in an Arabic preview', () => {
    const match = matchInlineText('حصص مباشرة', ar);
    expect(match.kind).toBe('editable');
    expect(match.kind === 'editable' && match.candidate.locale).toBe('ar');
    expect(matchInlineText('Live classes', ar).kind).toBe('none');
  });

  it('English shown for an empty Arabic side goes to the panel, not in place', () => {
    const match = matchInlineText('Short pitch On two lines', ar);
    expect(match.kind).toBe('panel');
    expect(match.kind === 'panel' && match.candidate.fieldId).toBe(
      'section-field-description-ar'
    );
  });

  it('a value saved before text was bilingual goes to the panel', () => {
    const legacy = {
      type: 'about',
      config: { title: 'Our story', body: text('Body') },
    } as unknown as Pick<SectionInstance, 'type' | 'config'>;
    expect(
      matchInlineText(
        'Our story',
        inlineTextCandidates(legacy, 'modern-education', 'en')
      ).kind
    ).toBe('panel');
  });

  it('an image description never takes part', () => {
    // `imageAlt` equals the title, yet the title is still a unique match.
    expect(matchInlineText('Learn new skills', en).kind).toBe('editable');
  });
});

describe('findInlineTextTarget and canEditInPlace', () => {
  const build = (html: string) => {
    const anchor = document.createElement('div');
    anchor.innerHTML = html;
    document.body.append(anchor);
    return anchor;
  };
  const en = inlineTextCandidates(hero, 'modern-education', 'en');

  it('walks up from the element under the pointer to the one a field shows', () => {
    const anchor = build(
      '<section><h1><span id="a">Learn new skills</span></h1><p id="b">x <b>y</b></p></section>'
    );
    const found = findInlineTextTarget(anchor.querySelector('#a')!, anchor, en);
    expect(found?.element.id).toBe('a');
    expect(findInlineTextTarget(anchor.querySelector('b')!, anchor, en)).toBe(
      null
    );
  });

  it('edits in place only plain text that is exactly the stored value', () => {
    const anchor = build(
      '<h1 id="plain">Learn new skills</h1><h2 id="marked">Learn <em>new</em> skills</h2><h3 id="spaced">  Learn new skills </h3>'
    );
    const match = matchInlineText('Learn new skills', en);
    expect(match.kind).toBe('editable');
    if (match.kind !== 'editable') return;
    expect(
      canEditInPlace(anchor.querySelector('#plain')!, match.candidate)
    ).toBe(true);
    expect(
      canEditInPlace(anchor.querySelector('#marked')!, match.candidate)
    ).toBe(false);
    expect(
      canEditInPlace(anchor.querySelector('#spaced')!, match.candidate)
    ).toBe(false);
  });
});

describe('setInlineText', () => {
  it('changes one language of one field and nothing else', () => {
    const next = setInlineText(
      hero.config,
      ['highlights', 1, 'label'],
      'ar',
      'شهادة'
    );
    const config = next as unknown as typeof hero.config & {
      highlights: { label: { en: string; ar: string } }[];
    };
    expect(config.highlights[1]?.label).toEqual({
      en: 'Certificates',
      ar: 'شهادة',
    });
    expect(config.highlights[0]).toBe(
      (hero.config as unknown as { highlights: unknown[] }).highlights[0]
    );
    expect(next).not.toBe(hero.config);
  });

  it('sets a button label', () => {
    const next = setInlineText(hero.config, ['cta', 'label'], 'en', 'Go') as {
      cta: { label: unknown; pageId: string };
    };
    expect(next.cta).toEqual({
      label: { en: 'Go', ar: 'تصفح الدورات' },
      pageId: 'p1',
    });
  });
});

describe('typing', () => {
  it('inserts over the selection and stops at the limit', () => {
    expect(applyInlineInput('Hello', 5, 5, ' world')).toEqual({
      text: 'Hello world',
      caret: 11,
      limited: false,
    });
    expect(applyInlineInput('Hello', 0, 5, 'Hi')).toMatchObject({
      text: 'Hi',
      caret: 2,
    });
    expect(applyInlineInput('Hello', 5, 5, ' world', 8)).toEqual({
      text: 'Hello wo',
      caret: 8,
      limited: true,
    });
    // Over the limit already (saved before it): typing adds nothing.
    expect(applyInlineInput('Hello', 5, 5, '!', 3)).toMatchObject({
      text: 'Hello',
      limited: true,
    });
  });

  it('deletes a character, a word or a line', () => {
    expect(deletionRange('deleteContentBackward', 'abc', 3, 3)).toEqual([2, 3]);
    expect(deletionRange('deleteContentForward', 'abc', 0, 0)).toEqual([0, 1]);
    expect(deletionRange('deleteContentBackward', 'a😀', 3, 3)).toEqual([1, 3]);
    expect(deletionRange('deleteWordBackward', 'one two ', 8, 8)).toEqual([
      4, 8,
    ]);
    expect(deletionRange('deleteWordForward', 'one two', 3, 3)).toEqual([3, 7]);
    expect(deletionRange('deleteSoftLineBackward', 'a\nbc', 4, 4)).toEqual([
      2, 4,
    ]);
    expect(deletionRange('deleteContentBackward', 'abc', 0, 2)).toEqual([0, 2]);
  });
});
