/**
 * The content budget of Atelier's pinned scenes: the first of their three
 * safety layers (`../atelier-cinematic.css`).
 *
 * A pinned stage is exactly one window tall, so a chapter becomes a scene
 * only when its copy fits one. Whether it does is decided here, on the
 * server and in the browser alike, from the section's own strings: each
 * function estimates the stage's height, in rem, from the lines its copy
 * sets at the reference stage (a 1920×1080 desktop, the largest window the
 * scenes are designed for) and compares it with that window. Copy that
 * cannot fit there renders the static chapter on every screen, complete;
 * copy that fits there but not on a smaller window is caught after
 * hydration by the stage's fit check (`AtelierScene`).
 *
 * The estimate counts characters per line per text role and locale
 * (Arabic sets more characters to a line, at a taller line height), measured
 * in Chromium against the theme's fonts with wide-glyph English and
 * diacritised Arabic. It is deliberately conservative: an estimate past
 * the window only costs the motion, never content.
 */

type CopyLocale = 'en' | 'ar';

/** A text role at the reference stage: its measure (in advance units, see `advance`) and line height (rem). */
interface Role {
  readonly measure: number;
  readonly line: number;
}

type Metrics = Readonly<Record<CopyLocale, Role>>;

/** The reference stage: 1080px less the sticky header (76px), in rem. */
export const STAGE_REM = (1080 - 76) / 16;

const ARABIC_MARK = /[\u064B-\u065F\u0670\u06D6-\u06ED]/;
const ARABIC = /[\u0600-\u06FF]/;

/**
 * A character's approximate advance, relative to an average lowercase
 * letter: wide capitals and m/w count more, narrow letters and spaces less,
 * Arabic diacritics nothing (they sit on their letter).
 */
export function advance(char: string): number {
  if (ARABIC_MARK.test(char)) return 0;
  if (char === ' ') return 0.5;
  if (char === 'W' || char === 'M') return 1.8;
  if (char === 'm' || char === 'w') return 1.5;
  if (/[A-Z]/.test(char)) return 1.35;
  if (/[ijlftrI.,;:'’!|]/.test(char)) return 0.6;
  if (ARABIC.test(char)) return 1;
  return 1;
}

function width(word: string): number {
  let total = 0;
  for (const char of word) total += advance(char);
  return total;
}

/**
 * Lines a string sets in a measure: greedy word wrap, a word longer than
 * the measure broken across lines (the theme's `overflow-wrap: anywhere`),
 * each paragraph starting a new line.
 */
export function linesOf(text: string, measure: number): number {
  const space = advance(' ');
  let lines = 0;
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let line = 0;
    lines += 1;
    for (const word of words) {
      const w = width(word);
      if (line > 0 && line + space + w <= measure) {
        line += space + w;
        continue;
      }
      if (line > 0) lines += 1;
      // A word wider than the measure breaks across lines.
      const spill = Math.max(0, Math.ceil(w / measure) - 1);
      lines += spill;
      line = w - spill * measure;
    }
  }
  return lines;
}

function height(text: string, role: Metrics, locale: CopyLocale): number {
  const { measure, line } = role[locale];
  return linesOf(text, measure) * line;
}

/* ------------------------------------------------------------------ */
/* Opening — the hero spread                                            */
/* ------------------------------------------------------------------ */

/** The spread's copy column (eight of twelve columns) at the reference stage. */
const OPENING = {
  eyebrow: {
    en: { measure: 90, line: 1.05 },
    ar: { measure: 100, line: 1.225 },
  },
  title: {
    en: { measure: 15, line: 6.95 },
    ar: { measure: 16, line: 9.22 },
  },
  /* The subtitle and description share the end half of the column. */
  subtitle: {
    en: { measure: 26, line: 2.25 },
    ar: { measure: 29, line: 2.44 },
  },
  description: {
    en: { measure: 32, line: 2 },
    ar: { measure: 38, line: 2 },
  },
  /* The highlights fill the start half, one hairline row each. */
  highlight: {
    en: { measure: 36, line: 1.5 },
    ar: { measure: 42, line: 1.5 },
  },
} satisfies Record<string, Metrics>;

/** Fixed parts of the spread, in rem. */
const OPENING_FIXED = {
  /* The stage's padding, top and bottom. */
  padding: 4.5,
  /* Between the copy's blocks (eyebrow and headline, the two halves, the actions, the search). */
  gap: 2.45,
  eyebrowGap: 1.5,
  subtitleGap: 1,
  /* One highlight row's padding and hairline. */
  highlightRow: 1.8,
  /* A row of large actions, and how many characters of labels fit one row. */
  actionsRow: 3.5,
  actionsRowGap: 0.75,
  actionsPerRow: 72,
  search: 4.6,
};

export interface OpeningCopy {
  readonly eyebrow: string;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly highlights: readonly string[];
  /** The action labels (empty for an action that is not shown). */
  readonly actions: readonly string[];
  readonly search: boolean;
}

/** The spread's estimated height at the reference stage, in rem. */
export function openingHeight(copy: OpeningCopy, locale: CopyLocale): number {
  const f = OPENING_FIXED;
  const blocks: number[] = [];
  blocks.push(
    (copy.eyebrow
      ? height(copy.eyebrow, OPENING.eyebrow, locale) + f.eyebrowGap
      : 0) + height(copy.title, OPENING.title, locale)
  );
  const aside =
    height(copy.subtitle, OPENING.subtitle, locale) +
    (copy.subtitle && copy.description ? f.subtitleGap : 0) +
    height(copy.description, OPENING.description, locale);
  const highlights = copy.highlights
    .filter(Boolean)
    .reduce(
      (total, label) =>
        total + height(label, OPENING.highlight, locale) + f.highlightRow,
      0
    );
  if (aside || highlights) blocks.push(Math.max(aside, highlights));
  const labels = copy.actions.filter(Boolean);
  if (labels.length > 0) {
    const chars = labels.reduce((total, label) => total + label.length, 0);
    const rows = Math.ceil(chars / f.actionsPerRow);
    blocks.push(rows * f.actionsRow + (rows - 1) * f.actionsRowGap);
  }
  if (copy.search) blocks.push(f.search);
  return (
    f.padding +
    blocks.reduce((total, block) => total + block, 0) +
    (blocks.length - 1) * f.gap
  );
}

/** Whether the hero spread can play the opening scene. */
export function openingFitsWindow(
  copy: OpeningCopy,
  locale: CopyLocale
): boolean {
  return openingHeight(copy, locale) <= STAGE_REM;
}

/* ------------------------------------------------------------------ */
/* Method — the syllabus                                                */
/* ------------------------------------------------------------------ */

const METHOD = {
  /* The chapter title across seven columns. */
  title: {
    en: { measure: 24, line: 3.9 },
    ar: { measure: 25, line: 4.875 },
  },
  /* The lead beside the title (four columns)… */
  description: {
    en: { measure: 33, line: 2 },
    ar: { measure: 35, line: 2 },
  },
  /* …or under it (seven columns) when the plate takes the end side. */
  descriptionUnder: {
    en: { measure: 61, line: 2 },
    ar: { measure: 69, line: 2 },
  },
  /* One step on the track: its title at subtitle size, its description at
     lead size within 36ch. */
  stepTitle: {
    en: { measure: 38, line: 2.25 },
    ar: { measure: 42, line: 2.44 },
  },
  stepText: {
    en: { measure: 39, line: 2.06 },
    ar: { measure: 45, line: 2.06 },
  },
} satisfies Record<string, Metrics>;

const METHOD_FIXED = {
  padding: 8,
  /* The chapter mark above the title. */
  mark: 3.5,
  headerGap: 4,
  descriptionGap: 1.5,
  /* The plate's height beside the title (it shrinks on short windows). */
  plate: 15,
  /* A step's knot padding and poster numeral, and the gaps inside it. */
  stepHead: 10.5,
  stepGaps: 1.6,
};

export interface MethodCopy {
  readonly title: string;
  readonly description: string;
  readonly image: boolean;
  readonly steps: readonly {
    readonly title: string;
    readonly description: string;
  }[];
}

/** The method stage's estimated height at the reference stage, in rem. */
export function methodHeight(copy: MethodCopy, locale: CopyLocale): number {
  const f = METHOD_FIXED;
  const title = height(copy.title, METHOD.title, locale);
  const header = copy.image
    ? Math.max(
        title +
          (title && copy.description ? f.descriptionGap : 0) +
          height(copy.description, METHOD.descriptionUnder, locale),
        f.plate
      )
    : Math.max(title, height(copy.description, METHOD.description, locale));
  const step = copy.steps.reduce(
    (tallest, item) =>
      Math.max(
        tallest,
        height(item.title, METHOD.stepTitle, locale) +
          height(item.description, METHOD.stepText, locale)
      ),
    0
  );
  return (
    f.padding + f.mark + header + f.headerGap + f.stepHead + f.stepGaps + step
  );
}

/** Whether the steps chapter can play the method scene. */
export function methodFitsWindow(
  copy: MethodCopy,
  locale: CopyLocale
): boolean {
  return methodHeight(copy, locale) <= STAGE_REM;
}

/* ------------------------------------------------------------------ */
/* Ink — the figures                                                    */
/* ------------------------------------------------------------------ */

const INK = {
  title: {
    en: { measure: 31, line: 3.9 },
    ar: { measure: 34, line: 4.875 },
  },
  /* A label in its figure's column (a quarter of the body at most). */
  label: {
    en: { measure: 23, line: 1.05 },
    ar: { measure: 27, line: 1.225 },
  },
} satisfies Record<string, Metrics>;

const INK_FIXED = {
  padding: 8,
  headerGap: 4,
  /* A row of figures: the numeral, its gap and padding. */
  figureRow: 10.5,
  rowGap: 1.5,
  perRow: 4,
};

export interface InkCopy {
  readonly title: string;
  readonly labels: readonly string[];
}

/** The ink stage's estimated height at the reference stage, in rem. */
export function inkHeight(copy: InkCopy, locale: CopyLocale): number {
  const f = INK_FIXED;
  const rows = Math.ceil(copy.labels.length / f.perRow);
  const label = copy.labels.reduce(
    (tallest, text) => Math.max(tallest, height(text, INK.label, locale)),
    0
  );
  const title = height(copy.title, INK.title, locale);
  return (
    f.padding +
    (title ? title + f.headerGap : 0) +
    rows * (f.figureRow + label) +
    Math.max(0, rows - 1) * f.rowGap
  );
}

/** Whether the statistics chapter can play the ink scene. */
export function inkFitsWindow(copy: InkCopy, locale: CopyLocale): boolean {
  return inkHeight(copy, locale) <= STAGE_REM;
}
