/**
 * Trend direction + magnitude for a metric card (P59).
 *
 * Lifted out of the former single Analysis page unchanged when that page was
 * split into four routes — shared by the panels that show change, rather
 * than copied into each.
 */
import type { TrendDirection } from '@components/data-display';

export function trendFor(
  changePercent: number | undefined
): { direction: TrendDirection; magnitude: number } | undefined {
  if (changePercent === undefined) return undefined;
  return {
    direction: changePercent > 0 ? 'up' : changePercent < 0 ? 'down' : 'flat',
    magnitude: changePercent,
  };
}
