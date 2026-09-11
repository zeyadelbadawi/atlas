/**
 * Structured legal-document content.
 *
 * WHY STRUCTURED DATA RATHER THAN i18n JSON. These documents are long,
 * heavily nested, and their two language versions must stay
 * section-for-section identical — a translation key silently missing from
 * `ar` would publish an English clause on an Arabic legal page, which is
 * worse than an untranslated label anywhere else in the product. A single
 * typed structure per language makes any divergence a compile error or a
 * test failure rather than a rendering accident.
 *
 * It also keeps the legal text reviewable as prose: a lawyer can read
 * `privacy-policy.en.ts` top to bottom without reconstructing it from
 * scattered keys.
 */

/** One paragraph, list, or table within a section. */
export type LegalBlock =
  | { readonly kind: 'paragraph'; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly string[] }
  | {
      /** A labelled list — used for "what we collect / why" style content. */
      readonly kind: 'definitions';
      readonly items: readonly {
        readonly term: string;
        readonly detail: string;
      }[];
    };

export interface LegalSection {
  /** Stable anchor id — identical across languages so a deep link survives a language switch. */
  readonly id: string;
  readonly heading: string;
  readonly blocks: readonly LegalBlock[];
}

export interface LegalDocument {
  readonly title: string;
  /** One-line description of what the document covers. */
  readonly summary: string;
  readonly effectiveDate: string;
  readonly lastUpdated: string;
  readonly sections: readonly LegalSection[];
}
