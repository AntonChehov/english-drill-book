/**
 * Every view of the app with an address that leads to it. The screenshot and
 * accessibility specs visit each one; src/ui/router.test.ts keeps the list in step
 * with the router.
 */
export interface View {
  /** Route name in src/ui/router.ts. */
  name: string;
  /** Address after the hash. */
  path: string;
  /** Text of the view's main heading. */
  heading: string;
}

export const views: readonly View[] = [
  { name: "start", path: "/", heading: "English Drill Book" },
  { name: "about", path: "/about", heading: "О приложении" },
  { name: "not-found", path: "/no-such-page", heading: "Страница не найдена" },
];

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

/** The address of a view relative to the app's base URL. */
export function addressOf(path: string): string {
  return `#${path}`;
}
