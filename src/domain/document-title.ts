/**
 * The text of the browser tab for a view: the view's title first, so that tabs
 * stay distinguishable, then the app's name. Without a view title, the app's name alone.
 */
export function documentTitle(appName: string, viewTitle?: string): string {
  const view = viewTitle?.trim();
  return view ? `${view} — ${appName}` : appName;
}
