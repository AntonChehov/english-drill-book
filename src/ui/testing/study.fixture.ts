// Helpers of the tests that mount screens in a DOM: a browser's storage in memory holding the demo
// books, the browser objects the DOM of the tests lacks, and the study screen mounted at an address.

import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { forceCloseDatabase, IDBFactory } from "fake-indexeddb";
import { expect, vi } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import coursePack from "../../../demo/course.pack.json";
import drillsPack from "../../../demo/drills.pack.json";
import type { Pack } from "../../domain/packs/types";
import { markDoneAttempt } from "../../domain/study";
import type { Store } from "../../storage/db";
import { getStore } from "../storage";
import StudyView from "../study/StudyView.vue";

/** The two demo books as the app keeps them once added. */
export const demoPacks = [coursePack, drillsPack] as unknown as Pack[];

let connections: IDBOpenDBRequest[] = [];

/**
 * An empty storage for one test. The connection of the test before is closed, so the app opens a
 * new one on the new storage instead of reusing it.
 */
export async function freshStorage(): Promise<void> {
  // A connection with a write still running closes when it ends; the app forgets it on the close.
  await Promise.all(
    connections.map(
      (connection) =>
        new Promise<void>((resolve) => {
          connection.result.addEventListener("close", () => resolve(), { once: true });
          forceCloseDatabase(connection.result as never);
        }),
    ),
  );
  const factory = new IDBFactory();
  const open = factory.open.bind(factory);
  connections = [];
  vi.spyOn(factory, "open").mockImplementation((name, version) => {
    const request = open(name, version);
    connections.push(request);
    return request;
  });
  vi.stubGlobal("indexedDB", factory);
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

export interface Mounted {
  readonly wrapper: VueWrapper;
  readonly router: Router;
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
  const root = document.createElement("div");
  document.body.append(root);
  const wrapper = mount(
    {
      // A unit is a screen of its own, as the app's frame draws it.
      template:
        '<RouterView v-slot="{ Component, route }"><component :is="Component" :key="route.path" /></RouterView>',
    },
    { attachTo: root, global: { plugins: [router] } },
  );
  await settle(wrapper);
  return { wrapper, router };
}

/** Waits until the screen has stopped loading. */
export async function settle(wrapper: VueWrapper): Promise<void> {
  await vi.waitFor(() => expect(wrapper.find(".loading").exists()).toBe(false), { interval: 5 });
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
