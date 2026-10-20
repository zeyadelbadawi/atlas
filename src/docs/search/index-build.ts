/**
 * The per-language search index (`/search-index.<lang>.json`), built with
 * the pages and fetched by the browser the first time the search box is
 * used. Plain JSON, no runtime library: the help center CSP is
 * `script-src 'self'`, and ~90 articles per language need nothing more.
 *
 *   docs   [url, title, category title, summary]
 *   terms  token → flat [docIndex, weight, docIndex, weight, …]
 *
 * Weights: title 12, keywords 8, headings 5, summary 3, body 1 (per
 * distinct token per field, summed).
 */
import { tokenize } from './normalize';

export interface SearchSource {
  readonly url: string;
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly keywords: readonly string[];
  readonly headings: readonly string[];
  readonly body: string;
}

export interface SearchIndex {
  readonly v: 1;
  readonly docs: readonly (readonly [string, string, string, string])[];
  readonly terms: Readonly<Record<string, readonly number[]>>;
}

const WEIGHTS = { title: 12, keywords: 8, headings: 5, summary: 3, body: 1 } as const;

export function buildSearchIndex(sources: readonly SearchSource[]): SearchIndex {
  const terms = new Map<string, Map<number, number>>();
  sources.forEach((source, index) => {
    const fields: [keyof typeof WEIGHTS, string][] = [
      ['title', source.title],
      ['keywords', source.keywords.join(' ')],
      ['headings', source.headings.join(' ')],
      ['summary', source.summary],
      ['body', source.body],
    ];
    for (const [field, text] of fields) {
      for (const token of new Set(tokenize(text))) {
        const postings = terms.get(token) ?? new Map<number, number>();
        postings.set(index, (postings.get(index) ?? 0) + WEIGHTS[field]);
        terms.set(token, postings);
      }
    }
  });
  const sortedTerms: Record<string, number[]> = {};
  for (const token of [...terms.keys()].sort()) {
    const flat: number[] = [];
    for (const [doc, weight] of [...terms.get(token)!.entries()].sort((a, b) => a[0] - b[0])) flat.push(doc, weight);
    sortedTerms[token] = flat;
  }
  return {
    v: 1,
    docs: sources.map((s) => [s.url, s.title, s.category, s.summary] as const),
    terms: sortedTerms,
  };
}

export interface SearchHit {
  readonly url: string;
  readonly title: string;
  readonly category: string;
  readonly summary: string;
  readonly score: number;
}

/**
 * Ranks documents for a query: every query word must match (the last one
 * as a prefix, so results appear while typing); if nothing matches all
 * words, documents matching most words are returned.
 */
export function searchIndex(index: SearchIndex, query: string, limit = 8): SearchHit[] {
  const words = tokenize(query);
  if (words.length === 0) return [];
  const keys = Object.keys(index.terms);
  const perWord: Map<number, number>[] = words.map((word, i) => {
    const scores = new Map<number, number>();
    const last = i === words.length - 1;
    const matching = keys.filter((key) => key === word || ((last || word.length >= 4) && key.startsWith(word)));
    for (const key of matching) {
      const exact = key === word ? 1 : 0.6;
      const postings = index.terms[key];
      for (let j = 0; j < postings.length; j += 2) {
        scores.set(postings[j], Math.max(scores.get(postings[j]) ?? 0, postings[j + 1] * exact));
      }
    }
    return scores;
  });
  const totals = new Map<number, { score: number; matched: number }>();
  for (const scores of perWord) {
    for (const [doc, score] of scores) {
      const t = totals.get(doc) ?? { score: 0, matched: 0 };
      t.score += score;
      t.matched += 1;
      totals.set(doc, t);
    }
  }
  const best = Math.max(0, ...[...totals.values()].map((t) => t.matched));
  return [...totals.entries()]
    .filter(([, t]) => t.matched === best)
    .sort((a, b) => b[1].score - a[1].score || a[0] - b[0])
    .slice(0, limit)
    .map(([doc, t]) => {
      const [url, title, category, summary] = index.docs[doc];
      return { url, title, category, summary, score: t.score };
    });
}
