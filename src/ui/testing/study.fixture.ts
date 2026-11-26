// Helpers of the tests that mount screens in a DOM: a browser's storage in memory holding the demo
// books, the browser objects the DOM of the tests lacks, and the study screen mounted at an address.

import { forceCloseDatabase, IDBFactory } from "fake-indexeddb";
import { expect, vi } from "vitest";
import { createApp, h, type Component } from "vue";
import { createMemoryHistory, createRouter, RouterView, type Router } from "vue-router";
import coursePack from "../../../demo/course.pack.json";
import drillsPack from "../../../demo/drills.pack.json";
import type { Pack } from "../../domain/packs/types";
import { markDoneAttempt } from "../../domain/study";
import type { Store } from "../../storage/db";
import { rawOpen } from "../../storage/db/db.fixture";
import { SCHEMA_VERSION } from "../../storage/db/schema";
import App from "../App.vue";
import { doneExercises } from "../demo/progress";
import { demoState, partialDemo } from "../demo/state";
import { createAppRouter } from "../router";
import { getStore, newerVersion } from "../storage";
import StudyView from "../study/StudyView.vue";
import { applyTheme } from "../theme";

/** The two demo books as the app keeps them once added. */
export const demoPacks = [coursePack, drillsPack] as unknown as Pack[];

let connections: IDBOpenDBRequest[] = [];
let factory: IDBFactory = new IDBFactory();

/** The screens mounted and not yet closed: one left running would write into a later test's storage. */
const apps: { unmount(): void }[] = [];

/**
 * An empty storage for a test that starts. The screens of the test before are closed first: they
 * still have timers and writes of their own, which would end in the new storage.
 */
export async function freshStorage(): Promise<void> {
  for (const app of apps.splice(0)) app.unmount();
  await clearSiteData();
}

/**
 * The storage emptied, as when the browser's data of the site is cleared: the connections are
 * closed, so the app opens a new one on the new storage instead of reusing the old.
 */
export async function clearSiteData(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
  // A connection with a write still running closes when it ends; the app forgets it on the close.
  await Promise.all(
    connections.map(
      (connection) =>
        new Promise<void>((resolve) => {
          const close = () => {
            // An open that failed, as one of a version too old, has no connection to close.
            const database = (connection.result ?? undefined) as IDBDatabase | undefined;
            if (database === undefined) return resolve();
            database.addEventListener("close", () => resolve(), { once: true });
            forceCloseDatabase(database as never);
          };
          // A test can end while the app is still opening the database: it is closed once the app
          // has finished opening it.
          if (connection.readyState === "done") close();
          else {
            connection.addEventListener("success", () => setImmediate(close), { once: true });
            connection.addEventListener("error", () => resolve(), { once: true });
          }
        }),
    ),
  );
  factory = new IDBFactory();
  const open = factory.open.bind(factory);
  connections = [];
  vi.spyOn(factory, "open").mockImplementation((name, version) => {
    const request = open(name, version);
    connections.push(request);
    return request;
  });
  vi.stubGlobal("indexedDB", factory);
}

/**
 * A newer version of the app opens the database and upgrades it, as another tab or an earlier visit
 * with a newer app does. It waits until the app's own connection, if it has one, has let go.
 */
export async function upgradeFromNewerVersion(): Promise<void> {
  (await rawOpen(factory, SCHEMA_VERSION + 1)).close();
}

/** The storage of the app, with the demo books added when `packs` is not given. */
export async function seededStore(packs: readonly Pack[] = demoPacks): Promise<Store> {
  const store = await getStore();
  await store.putPacks(packs);
  return store;
}

/** What the DOM of the tests has not: observers of size and of the viewport, with no effect. */
export function stubObservers(): void {
  class Observer {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", Observer);
  vi.stubGlobal("IntersectionObserver", Observer);
}

/** Makes the screen wide or narrow: below 1024 px the navigation of a unit is in the bar. */
export function stubScreen(narrow: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList =>
      ({
        matches: query.includes("max-width") ? narrow : false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }) as unknown as MediaQueryList,
  );
}

interface Mounted {
  /** The screen drawn in the document; `unmount` closes it. */
  readonly app: { unmount(): void };
  readonly router: Router;
}

/** Lets what is waiting on a promise or a timer of the storage run. */
export const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

/** Draws `root` with the router in a new element of the document. */
function draw(root: Component, router: Router): { unmount(): void } {
  const element = document.createElement("div");
  document.body.append(element);
  const app = createApp(root).use(router);
  app.mount(element);
  apps.push(app);
  return app;
}

/** Mounts the study screen at `address`, in the document so that focus can be seen, and settles it. */
export async function mountStudy(address: string): Promise<Mounted> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<p>Главная</p>" } },
      { path: "/study/:pack/:unit", component: StudyView },
    ],
  });
  await router.push(address);
  await router.isReady();
  // A unit is a screen of its own, as the app's frame draws it.
  const app = draw(
    () =>
      h(RouterView, null, {
        default: ({ Component, route }: { Component: Component; route: { path: string } }) =>
          h(Component, { key: route.path }),
      }),
    router,
  );
  await settle();
  return { app, router };
}

/** Mounts the whole app at `address`, in the document, and waits for the screen to be drawn. */
export async function mountApp(address: string): Promise<Mounted> {
  const router = createAppRouter(createMemoryHistory());
  await router.push(address);
  await router.isReady();
  const app = draw(App, router);
  await settle();
  return { app, router };
}

/**
 * Waits until the start screen or Topics has read the store for the demo. A test that ends sooner
 * would leave the reading to run into the next one.
 */
export async function demoChecked(): Promise<void> {
  await vi.waitFor(() => expect(demoState.value.phase).not.toBe("loading"), { interval: 5 });
  await flushPromises();
}

/** Closes the app and clears what it keeps in memory between screens, as when a page is opened. */
export function resetApp(): void {
  for (const app of apps.splice(0)) app.unmount();
  demoState.value = { phase: "loading" };
  partialDemo.value = { books: [], unreadable: [] };
  newerVersion.value = false;
  doneExercises.clear();
  applyTheme("system");
  document.title = "";
  document.body.innerHTML = "";
}

/** Waits until the screen has stopped loading. */
async function settle(): Promise<void> {
  await vi.waitFor(() => expect(document.querySelector(".loading")).toBeNull(), { interval: 5 });
  await flushPromises();
}

const spaced = (text: string | null) => (text ?? "").replace(/\s+/g, " ").trim();

/** What a screen reader says of an element: its label, else its text. */
const nameOf = (element: Element) =>
  element.getAttribute("aria-label") ?? spaced(element.textContent);

const matches = (name: string, wanted: string | RegExp) =>
  typeof wanted === "string" ? name === wanted : wanted.test(name);

/** The buttons of the page, or of `root`, whose name is `name`. */
export function buttonsNamed(
  name: string | RegExp,
  root: ParentNode = document,
): HTMLButtonElement[] {
  return [...root.querySelectorAll("button")].filter((button) => matches(nameOf(button), name));
}

/** The one button named `name`; a test that expects none uses `buttonsNamed`. */
export function buttonNamed(name: string | RegExp, root: ParentNode = document): HTMLButtonElement {
  const found = buttonsNamed(name, root);
  if (found.length !== 1) throw new Error(`Expected one button "${name}", found ${found.length}`);
  return found[0]!;
}

/** The exercise `id` of the unit, as the learner sees it: a block named by its number. */
export function exerciseOf(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`article[id="ex-${id.replaceAll(".", "-")}"]`);
  if (found === null) throw new Error(`No exercise ${id}`);
  return found;
}

/** The text field of item `item` of `exercise`, found by the label that names it. */
export function fieldOf(exercise: HTMLElement, item: string): HTMLInputElement {
  const label = [...exercise.querySelectorAll("label")].find((each) =>
    spaced(each.textContent).startsWith(`Пункт ${item}.`),
  );
  const field = label?.htmlFor
    ? exercise.querySelector<HTMLInputElement>(`[id="${label.htmlFor}"]`)
    : null;
  if (field === null || field === undefined) throw new Error(`No field for item ${item}`);
  return field;
}

/** The option `choice` of item `item` of `exercise`. */
export function optionOf(exercise: HTMLElement, item: string, choice: string): HTMLInputElement {
  const group = [...exercise.querySelectorAll("fieldset")].find((each) =>
    spaced(each.querySelector("legend")?.textContent ?? null).startsWith(`Пункт ${item}.`),
  );
  const option = [...(group?.querySelectorAll("label") ?? [])].find(
    (each) => spaced(each.textContent) === choice,
  );
  const input = option?.querySelector("input");
  if (input === null || input === undefined)
    throw new Error(`No option ${choice} for item ${item}`);
  return input;
}

/** Types `text` into `field` as a learner does: the field holds it and says it changed. */
export async function type(
  field: HTMLInputElement | HTMLTextAreaElement,
  text: string,
): Promise<void> {
  field.focus();
  field.value = text;
  field.dispatchEvent(new Event("input", { bubbles: true }));
  await flushPromises();
}

/** Presses Enter in `field`. */
export async function pressEnter(field: HTMLElement, init: KeyboardEventInit = {}): Promise<void> {
  field.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true, ...init }),
  );
  await flushPromises();
}

/** Clicks `element` and lets the screen react. */
export async function click(element: HTMLElement): Promise<void> {
  element.click();
  await flushPromises();
}

/** The text of `element`, in one line. */
export const textOf = (element: Element) => spaced(element.textContent);

let marked = 0;

/** Another tab marks the exercise `exercise` of the pack `pack` done in the shared storage. */
export async function markDoneElsewhere(pack: string, exercise: string): Promise<void> {
  marked += 1;
  const attempt = markDoneAttempt(
    {
      id: `00000000-0000-4000-8000-${String(marked).padStart(12, "0")}`,
      at: "2026-01-01T10:00:00.000Z",
      pack: { id: pack, version: "1.0.0" },
      exercise,
    },
    {},
  );
  if (attempt === undefined) throw new Error("Nothing to mark");
  await (await getStore()).appendAttempt(attempt);
}
