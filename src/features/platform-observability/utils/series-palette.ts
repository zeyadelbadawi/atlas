/**
 * Categorical colours for multi-series monitoring charts.
 *
 * WHY NOT `--chart-1..6`. Those tokens were run through the data-viz
 * palette validator against Atlas's own card surfaces (light `#ffffff`,
 * dark `hsl(199 28% 12%)`) and FAIL it: slot 1 is below the chroma floor
 * in light mode, several dark steps are outside the lightness band, and
 * the worst adjacent pairs are 5.6 (light) / 4.6 (dark) ΔE under deutan
 * simulation — a queue-per-line chart a colour-blind operator cannot read.
 *
 * These eight slots, in THIS order, pass every hard gate on the same
 * surfaces (worst adjacent CVD ΔE 9.1 light / 8.4 dark; normal-vision
 * ΔE ≥ 19.3). Three light steps sit under 3:1 contrast, so every chart
 * ships a legend and a table view (the relief the validator requires).
 *
 * Colour follows the series' POSITION in the response, which the backend
 * keeps stable per label set; status colours are never used for series.
 * More than eight series are not given generated hues — the extra series
 * are listed in the table view instead.
 */
export const SERIES_PALETTE: readonly {
  readonly light: string;
  readonly dark: string;
}[] = [
  { light: '#2a78d6', dark: '#3987e5' },
  { light: '#eb6834', dark: '#d95926' },
  { light: '#1baf7a', dark: '#199e70' },
  { light: '#eda100', dark: '#c98500' },
  { light: '#e87ba4', dark: '#d55181' },
  { light: '#008300', dark: '#008300' },
  { light: '#4a3aa7', dark: '#9085e9' },
  { light: '#e34948', dark: '#e66767' },
];

export const MAX_CHART_SERIES = SERIES_PALETTE.length;
