// Makes this file a module, so the declaration below augments vue-router instead of replacing it.
import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** Russian title of the view, shown in the browser tab. */
    title?: string;
    /** The view uses the whole width of the window, as Study does. */
    wide?: boolean;
  }
}
