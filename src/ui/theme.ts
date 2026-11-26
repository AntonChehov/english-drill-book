// The theme of the app: «Как в системе» leaves the colours to the system setting, the other two
// override it. The page carries the choice in `data-theme`, which base.css reads.

import { ref } from "vue";
import type { Settings } from "../storage/db";

export type Theme = Settings["theme"];

/** The theme applied now, for «Оформление» on «О приложении». */
export const theme = ref<Theme>("system");

/** Applies `theme` to the page at once; it is kept separately. */
export function applyTheme(
  chosen: Theme,
  root: Pick<Element, "setAttribute" | "removeAttribute"> = document.documentElement,
): void {
  theme.value = chosen;
  if (chosen === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", chosen);
}

/**
 * The stored theme, for the first screen: the read is given `limit` milliseconds, so a slow or
 * failing store never keeps the app from starting, and then it is the system's.
 */
export async function storedTheme(
  read: () => Promise<Theme | undefined>,
  limit = 300,
): Promise<Theme> {
  const late = new Promise<undefined>((resolve) => setTimeout(resolve, limit));
  try {
    return (await Promise.race([read(), late])) ?? "system";
  } catch {
    return "system";
  }
}
