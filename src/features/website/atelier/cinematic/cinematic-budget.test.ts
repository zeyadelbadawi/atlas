/**
 * The pinned scenes' content budget (`cinematic-budget.ts`): pure,
 * deterministic and locale-aware; the Atelier starter copy fits; copy at the
 * hardening contract's caps (wide-glyph English, diacritised Arabic) and
 * legacy copy over them does not; and only what occupies the stage counts.
 */
import { describe, expect, it } from 'vitest';
import {
  STAGE_REM,
  advance,
  inkFitsWindow,
  inkHeight,
  linesOf,
  methodFitsWindow,
  methodHeight,
  openingFitsWindow,
  openingHeight,
  type MethodCopy,
  type OpeningCopy,
} from './cinematic-budget';

const EN_WORDS =
  'Wholehearted Workmanship Masterworks Methodical Mentorship Woodworking Multidisciplinary Watercolour Wayfinding Meaningful';
const AR_WORDS =
  'ورشُ عملٍ مُتخصِّصةٌ للمحترفين والمبتدئين مع مُدرِّبين خبراءَ في التَّصميم والكتابة الإبداعيّة والحِرَف اليدويّة';

/** Exactly `length` characters of running words. */
function fill(words: string, length: number): string {
  return words.repeat(Math.ceil(length / words.length) + 1).slice(0, length);
}
const en = (length: number) => fill(`${EN_WORDS} `, length);
const ar = (length: number) => fill(`${AR_WORDS} `, length);

/** The Atelier starter Home's hero (template copy), with the search on. */
const STARTER: Record<'en' | 'ar', OpeningCopy> = {
  en: {
    eyebrow: 'Horizon Academy — a learning studio',
    title: 'Learn deliberately, one chapter at a time',
    subtitle: '',
    description:
      'Every course at Horizon Academy is set out like a well-made book: a clear outline, an order to follow and room to think.',
    highlights: [
      'A clear outline for every course',
      'Lessons in a considered order',
      'Your questions are welcome',
    ],
    actions: ['Browse the courses', 'Write to us'],
    search: true,
  },
  ar: {
    eyebrow: 'Horizon Academy — استوديو للتعلّم',
    title: 'تعلّم بتأنٍّ، فصلًا بعد فصل',
    subtitle: '',
    description:
      'تُقدَّم كل دورة في Horizon Academy كما يُصنع كتاب متقن: مخطّط واضح، وترتيب تتّبعه، ومساحة للتفكير.',
    highlights: [
      'لكل دورة مخطّط واضح',
      'دروس بترتيب مدروس',
      'أسئلتك موضع ترحيب',
    ],
    actions: ['استعرض الدورات', 'راسلنا'],
    search: true,
  },
};

/** Every hero field at the contract's caps. */
const atCaps = (text: (length: number) => string): OpeningCopy => ({
  eyebrow: text(60),
  title: text(70),
  subtitle: text(140),
  description: text(280),
  highlights: [text(40), text(40), text(40), text(40)],
  actions: [text(40), text(40)],
  search: true,
});

describe('linesOf', () => {
  it('counts nothing for no text, and a line per paragraph', () => {
    expect(linesOf('', 20)).toBe(0);
    expect(linesOf('  \n ', 20)).toBe(0);
    expect(linesOf('one', 20)).toBe(1);
    expect(linesOf('one\ntwo\n\nthree', 20)).toBe(3);
  });

  it('wraps at word boundaries and breaks a word wider than the measure', () => {
    expect(linesOf('aaaa aaaa', 9)).toBe(1);
    expect(linesOf('aaaa aaaa', 8)).toBe(2);
    expect(linesOf('a'.repeat(25), 10)).toBe(3);
    expect(linesOf(`aa ${'a'.repeat(25)}`, 10)).toBe(4);
  });

  it('weighs wide capitals over narrow letters, and Arabic diacritics as nothing', () => {
    expect(advance('W')).toBeGreaterThan(advance('a'));
    expect(advance('i')).toBeLessThan(advance('a'));
    expect(linesOf('WWWW WWWW', 9)).toBeGreaterThan(linesOf('aaaa aaaa', 9));
    // The same Arabic words with and without their marks set alike.
    const marked = 'مُدرِّبين خبراءَ في التَّصميم والحِرَف';
    const bare = marked.replace(/[ً-ٰٟ]/g, '');
    expect(linesOf(marked, 12)).toBe(linesOf(bare, 12));
  });
});

describe('opening budget', () => {
  it('fits the starter spread in both languages', () => {
    expect(openingFitsWindow(STARTER.en, 'en')).toBe(true);
    expect(openingFitsWindow(STARTER.ar, 'ar')).toBe(true);
  });

  it('is pure and deterministic', () => {
    const copy = atCaps(en);
    expect(openingHeight(copy, 'en')).toBe(openingHeight({ ...copy }, 'en'));
  });

  it('refuses every field at its cap, in English and in Arabic', () => {
    expect(openingFitsWindow(atCaps(en), 'en')).toBe(false);
    expect(openingFitsWindow(atCaps(ar), 'ar')).toBe(false);
  });

  it('refuses legacy copy past the caps', () => {
    expect(
      openingFitsWindow(
        { ...STARTER.en, title: en(100), description: en(2000) },
        'en'
      )
    ).toBe(false);
  });

  it('counts what occupies the stage: each field, each highlight, the actions and the search', () => {
    const base = openingHeight(STARTER.en, 'en');
    expect(openingHeight({ ...STARTER.en, search: false }, 'en')).toBeLessThan(
      base
    );
    expect(
      openingHeight({ ...STARTER.en, title: en(70) }, 'en')
    ).toBeGreaterThan(base);
    expect(
      openingHeight(
        { ...STARTER.en, highlights: [...STARTER.en.highlights, en(40)] },
        'en'
      )
    ).toBeGreaterThan(base);
    expect(
      openingHeight({ ...STARTER.en, actions: [en(40), en(40)] }, 'en')
    ).toBeGreaterThan(base);
    expect(
      openingHeight({ ...STARTER.en, eyebrow: '', subtitle: '' }, 'en')
    ).toBeLessThan(base);
  });

  it('is locale-aware: the same copy is budgeted with each language’s measures', () => {
    const title = { ...STARTER.en, title: en(50), search: false };
    expect(openingHeight(title, 'en')).not.toBe(openingHeight(title, 'ar'));
    // Arabic sets more characters to a line, at a taller line height.
    expect(linesOf(ar(50), 16)).toBeLessThan(linesOf(en(50), 15));
  });

  it('budgets against the reference stage', () => {
    expect(STAGE_REM).toBeCloseTo(62.75);
  });
});

describe('method budget', () => {
  const steps = (
    count: number,
    title: string,
    description: string
  ): MethodCopy['steps'] =>
    Array.from({ length: count }, () => ({ title, description }));
  const typical: MethodCopy = {
    title: 'The method',
    description: 'Three movements, from the first page to the last.',
    image: false,
    steps: steps(
      3,
      'Read the outline',
      'Open a course and see what it covers, its level and who teaches it.'
    ),
  };

  it('fits typical syllabi of three to six steps, with or without the plate', () => {
    for (const count of [3, 4, 5, 6]) {
      for (const image of [false, true]) {
        const copy = {
          ...typical,
          image,
          steps: steps(count, 'Read the outline', typical.steps[0].description),
        };
        expect(methodFitsWindow(copy, 'en'), `${count} ${image}`).toBe(true);
      }
    }
  });

  it('refuses the caps: chapter and step copy at their limits', () => {
    for (const [text, locale] of [
      [en, 'en'],
      [ar, 'ar'],
    ] as const) {
      expect(
        methodFitsWindow(
          {
            title: text(80),
            description: text(240),
            image: true,
            steps: steps(6, text(60), text(240)),
          },
          locale
        )
      ).toBe(false);
    }
  });

  it('measures the tallest step, not the number of steps', () => {
    expect(
      methodHeight({ ...typical, steps: steps(6, 'Read', 'Short.') }, 'en')
    ).toBe(
      methodHeight({ ...typical, steps: steps(3, 'Read', 'Short.') }, 'en')
    );
    expect(
      methodHeight(
        {
          ...typical,
          steps: [...typical.steps, { title: 'x', description: en(240) }],
        },
        'en'
      )
    ).toBeGreaterThan(methodHeight(typical, 'en'));
  });

  it('holds the plate’s height beside a short title', () => {
    expect(methodHeight({ ...typical, image: true }, 'en')).toBeGreaterThan(
      methodHeight(typical, 'en')
    );
  });
});

describe('ink budget', () => {
  it('fits the live figures with labels at their cap', () => {
    expect(
      inkFitsWindow({ title: en(80), labels: [en(40), en(40), en(40)] }, 'en')
    ).toBe(true);
    expect(
      inkFitsWindow({ title: ar(80), labels: [ar(40), ar(40), ar(40)] }, 'ar')
    ).toBe(true);
  });

  it('grows by rows of four figures and refuses three rows under a long title', () => {
    const labels = (count: number) =>
      Array.from({ length: count }, () => en(40));
    expect(inkHeight({ title: '', labels: labels(4) }, 'en')).toBe(
      inkHeight({ title: '', labels: labels(2) }, 'en')
    );
    expect(inkHeight({ title: '', labels: labels(5) }, 'en')).toBeGreaterThan(
      inkHeight({ title: '', labels: labels(4) }, 'en')
    );
    expect(inkFitsWindow({ title: en(80), labels: labels(12) }, 'en')).toBe(
      false
    );
  });
});
