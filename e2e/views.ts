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
  /**
   * The view needs the demo books added first: the specs that visit every view in a clean profile
   * leave it out, and the specs of Study cover it (e2e/study.ts).
   */
  demo?: boolean;
}

export const views: readonly View[] = [
  { name: "start", path: "/", heading: "English Drill Book" },
  { name: "about", path: "/about", heading: "О приложении" },
  { name: "not-found", path: "/no-such-page", heading: "Страница не найдена" },
  {
    name: "study",
    path: "/study/demo-course/1",
    heading: "Раздел 1. To be: am, is, are",
    demo: true,
  },
];

/** The views a clean profile can open as they are. */
export const plainViews = views.filter((view) => view.demo !== true);

export const themes = ["light", "dark"] as const;
export type Theme = (typeof themes)[number];

/** The address of a view relative to the app's base URL. */
export function addressOf(path: string): string {
  return `#${path}`;
}
