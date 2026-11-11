import { createRouter, createWebHashHistory, type RouteRecordRaw, type RouterHistory } from "vue-router";
import { documentTitle } from "../domain/document-title";
import AboutView from "./views/AboutView.vue";
import NotFoundView from "./views/NotFoundView.vue";
import StartView from "./views/StartView.vue";

export const appName = "English Drill Book";

/**
 * Every view of the app. Addresses live after the hash (design D2): GitHub Pages
 * cannot rewrite unknown paths to index.html, the hash survives reload on any static host.
 */
export const routes: RouteRecordRaw[] = [
  { path: "/", name: "start", component: StartView },
  { path: "/about", name: "about", component: AboutView, meta: { title: "О приложении" } },
  {
    path: "/:unknown(.*)*",
    name: "not-found",
    component: NotFoundView,
    meta: { title: "Страница не найдена" },
  },
];

export function createAppRouter(history: RouterHistory = createWebHashHistory()) {
  const router = createRouter({ history, routes });
  router.afterEach((to) => {
    document.title = documentTitle(appName, to.meta.title);
  });
  return router;
}
