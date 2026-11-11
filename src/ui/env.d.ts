import "vue-router";

declare module "vue-router" {
  interface RouteMeta {
    /** Russian title of the view, shown in the browser tab. */
    title?: string;
  }
}
