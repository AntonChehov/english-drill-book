// The numbers of Study's layout, pure
// so that they are tested without a browser.

/** The zooms, as multiples of the panel's width, that «Уменьшить» and «Увеличить» step through. */
const ZOOM_STEPS: readonly number[] = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

export const MIN_ZOOM = ZOOM_STEPS[0]!;
export const MAX_ZOOM = ZOOM_STEPS.at(-1)!;

/** The pages' share of the row from 1024 px: its limits and the one a visitor starts with. */
export const MIN_SPLIT = 0.3;
export const MAX_SPLIT = 0.75;
export const DEFAULT_SPLIT = 0.6;

/** How far an arrow key moves the separator. */
const SPLIT_STEP = 0.05;

/** `zoom` kept within the limits; one that is not a number is 100 %. */
export function clampZoom(zoom: unknown): number {
  return typeof zoom === "number" && Number.isFinite(zoom)
    ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))
    : 1;
}

/** The next step above or below `zoom`; `zoom` itself at the end of the range. */
export function stepZoom(zoom: number, direction: 1 | -1): number {
  const steps = direction === 1 ? ZOOM_STEPS : ZOOM_STEPS.toReversed();
  return steps.find((step) => (step - zoom) * direction > 1e-9) ?? clampZoom(zoom);
}

/** The zoom as the toolbar says it: «150 %». */
export function zoomLabel(zoom: number): string {
  return `${Math.round(zoom * 100)} %`;
}

/**
 * The most of a row of `rowWidth` px the pages can take: the exercises keep 22 rem and the
 * separator is 0.75 rem wide, whatever `rem` is in px.
 */
export function maxSplit(rowWidth: number, rem: number): number {
  if (!(rowWidth > 0)) return MAX_SPLIT;
  return Math.max(MIN_SPLIT, Math.min(MAX_SPLIT, 1 - (22.75 * rem) / rowWidth));
}

/** `split` kept within the limits, `max` the highest; one that is not a number is the default. */
export function clampSplit(split: unknown, max = MAX_SPLIT): number {
  return typeof split === "number" && Number.isFinite(split)
    ? Math.min(max, Math.max(MIN_SPLIT, split))
    : DEFAULT_SPLIT;
}

/**
 * The split after `key` is pressed on the separator, `max` being the most the row allows;
 * `undefined` for a key it does not use.
 */
export function splitAfterKey(split: number, key: string, max = MAX_SPLIT): number | undefined {
  switch (key) {
    case "ArrowLeft":
      return clampSplit(Math.round((split - SPLIT_STEP) * 100) / 100, max);
    case "ArrowRight":
      return clampSplit(Math.round((split + SPLIT_STEP) * 100) / 100, max);
    case "Home":
      return MIN_SPLIT;
    case "End":
      return max;
    default:
      return undefined;
  }
}
