// The numbers of Study's layout (DOC-002, DOC-006; design D2 and D5 of `pages-panel-tools`), pure
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

/** `split` kept within the limits; one that is not a number is the default. */
export function clampSplit(split: unknown): number {
  return typeof split === "number" && Number.isFinite(split)
    ? Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, split))
    : DEFAULT_SPLIT;
}

/** The split after `key` is pressed on the separator; `undefined` for a key it does not use. */
export function splitAfterKey(split: number, key: string): number | undefined {
  switch (key) {
    case "ArrowLeft":
      return clampSplit(Math.round((split - SPLIT_STEP) * 100) / 100);
    case "ArrowRight":
      return clampSplit(Math.round((split + SPLIT_STEP) * 100) / 100);
    case "Home":
      return MIN_SPLIT;
    case "End":
      return MAX_SPLIT;
    default:
      return undefined;
  }
}
