import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { views } from "../../e2e/views";
import { createAppRouter, routes } from "./router";

describe("router", () => {
  it("lists every route in e2e/views.ts, so screenshots and accessibility checks cover it", () => {
    const routeNames = routes.map((route) => route.name);
    expect(views.map((view) => view.name).toSorted()).toEqual(routeNames.toSorted());
  });

  it("resolves the address of each view in e2e/views.ts to that view", () => {
    const router = createAppRouter(createMemoryHistory());
    for (const view of views) {
      expect(router.resolve(view.path).name).toBe(view.name);
    }
  });

  it("@req PROD-008 resolves any unknown address to the not-found view", () => {
    const router = createAppRouter(createMemoryHistory());
    for (const address of ["/x", "/about/x", "/a/b/c", "/темы"]) {
      expect(router.resolve(address).name).toBe("not-found");
    }
  });
});
