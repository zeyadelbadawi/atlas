/**
 * Atlas reporting primitives — public entry point.
 *
 * Used by the Analytics operational pages and by the tenant-facing
 * Data & retention page, which is why they live in `@components` rather
 * than inside either feature.
 */
export {
  StatTile,
  ReportSection,
  BreakdownTable,
  FigureList,
  TruncatedNotice,
  GeneratedAt,
  shareOf,
  toSortedRows,
} from './ReportPrimitives';
export type {
  StatTileProps,
  ReportSectionProps,
  BreakdownRow,
  BreakdownTableProps,
  FigureListItem,
} from './ReportPrimitives';
