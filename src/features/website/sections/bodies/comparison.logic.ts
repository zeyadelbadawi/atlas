/**
 * CMS phase 3d (batch C) — what every theme's comparison renderer reads
 * from a config, resolved once for the visitor's language: the columns with
 * a header, the rows with a label, and each row's value per column (✓, ✗, a
 * short text, or a dash where the Owner set nothing). Only the first
 * highlighted column is drawn as highlighted.
 */
import type { ComparisonSectionConfig, PublicWebsiteLocale } from '@types';
import { resolveLocalizedText } from '@/features/website/utils/localized-text.utils';

export interface ResolvedComparisonColumn {
  readonly id: string;
  readonly label: string;
  readonly highlighted: boolean;
}

export type ResolvedComparisonValue =
  | { readonly kind: 'yes' | 'no' | 'empty' }
  | { readonly kind: 'text'; readonly text: string };

export interface ResolvedComparisonRow {
  readonly id: string;
  readonly label: string;
  /** One per resolved column, in column order. */
  readonly values: readonly ResolvedComparisonValue[];
}

export interface ResolvedComparison {
  readonly columns: readonly ResolvedComparisonColumn[];
  readonly rows: readonly ResolvedComparisonRow[];
}

export function resolveComparison(
  config: ComparisonSectionConfig,
  locale: PublicWebsiteLocale
): ResolvedComparison {
  let highlightTaken = false;
  const columns = (config.columns ?? [])
    .map((column) => ({
      id: column.id,
      label: resolveLocalizedText(column.label, locale),
      highlighted: column.highlighted === true,
    }))
    .filter((column) => column.id && column.label)
    .map((column) => {
      const highlighted = column.highlighted && !highlightTaken;
      if (highlighted) highlightTaken = true;
      return { ...column, highlighted };
    });

  const rows = (config.rows ?? [])
    .map((row) => {
      const values = columns.map((column): ResolvedComparisonValue => {
        const cell = (row.cells ?? []).find(
          (candidate) => candidate.column === column.id
        );
        if (!cell) return { kind: 'empty' };
        if (cell.value === 'text') {
          const text = resolveLocalizedText(cell.text, locale);
          return text ? { kind: 'text', text } : { kind: 'empty' };
        }
        return { kind: cell.value === 'yes' ? 'yes' : 'no' };
      });
      return {
        id: row.id,
        label: resolveLocalizedText(row.label, locale),
        values,
      };
    })
    .filter((row) => row.label);

  return { columns, rows };
}

/** Whether there is anything to draw: two columns and a row. */
export function isDrawableComparison(comparison: ResolvedComparison): boolean {
  return comparison.columns.length >= 2 && comparison.rows.length > 0;
}
