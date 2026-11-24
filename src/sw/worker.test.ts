import { beforeEach, describe, expect, it, vi } from "vitest";

// The worker's handlers run against a stand-in for the browser's service worker scope and cache.

type Handler = (event: Record<string, unknown>) => void;

const scope = "https://example.test/drill/";
const cacheName = "edb-test";

let handlers: Record<string, Handler>;
let cache: {
  addAll: ReturnType<typeof vi.fn<(files: string[]) => Promise<void>>>;
  names: string[];
};
const answers = new Map<string, Response>();
const skipWaiting = vi.fn<() => Promise<void>>(async () => undefined);
const claim = vi.fn<() => Promise<void>>(async () => undefined);
const deleted: string[] = [];

beforeEach(async () => {
  handlers = {};
  answers.clear();
  deleted.length = 0;
  skipWaiting.mockClear();
  claim.mockClear();
  cache = {
    addAll: vi.fn<(files: string[]) => Promise<void>>(async () => undefined),
    names: [cacheName, "edb-old"],
  };
  vi.resetModules();
  vi.stubGlobal("APP_FILES", ["index.html", "assets/app-1.js", "favicon.svg"]);
  vi.stubGlobal("APP_CACHE", cacheName);
  vi.stubGlobal("self", {
    registration: { scope },
    skipWaiting,
    clients: { claim },
    addEventListener: (type: string, handler: Handler) => (handlers[type] = handler),
  });
  vi.stubGlobal("caches", {
    open: async (name: string) => (name === cacheName ? cache : undefined),
    keys: async () => cache.names,
    delete: async (name: string) => void deleted.push(name),
    match: async (address: string) => answers.get(address),
  });
  vi.stubGlobal("fetch", async () => new Response("network"));
  await import("./worker");
});

/** Runs a handler with an event that records what it was told to wait for or to answer. */
function run(type: string, event: Record<string, unknown> = {}) {
  const settled: Promise<unknown>[] = [];
  handlers[type]!({
    ...event,
    waitUntil: (promise: Promise<unknown>) => settled.push(promise),
    respondWith: (promise: Promise<unknown>) => settled.push(promise),
  });
  return { answered: settled.length > 0, done: Promise.all(settled) };
}

/** The text of the one response a handler answered with. */
async function textOf(done: Promise<unknown[]>): Promise<string> {
  return ((await done)[0] as Response).text();
}

const request = (url: string, init: { method?: string; mode?: string } = {}) => ({
  request: { url, method: init.method ?? "GET", mode: init.mode ?? "cors" },
});

describe("the service worker of the app", () => {
  it("@req PROD-003 keeps the listed files, from the folder it is served from, on install", async () => {
    await run("install").done;
    expect(cache.addAll).toHaveBeenCalledWith([
      `${scope}index.html`,
      `${scope}assets/app-1.js`,
      `${scope}favicon.svg`,
    ]);
    expect(skipWaiting).toHaveBeenCalled();
  });

  it("@req PROD-003 drops the caches of other builds and takes over on activation", async () => {
    await run("activate").done;
    expect(deleted).toEqual(["edb-old"]);
    expect(claim).toHaveBeenCalled();
  });

  it("@req PROD-003 answers a navigation of the app, whatever its hash, with the kept page", async () => {
    answers.set(`${scope}index.html`, new Response("page"));
    const { answered, done } = run("fetch", request(`${scope}#/topics`, { mode: "navigate" }));
    expect(answered).toBe(true);
    expect(await textOf(done)).toBe("page");
  });

  it("@req PROD-003 answers a listed file from the cache, and from the network if it is missing", async () => {
    answers.set(`${scope}assets/app-1.js`, new Response("kept"));
    expect(await textOf(run("fetch", request(`${scope}assets/app-1.js`)).done)).toBe("kept");
    expect(await textOf(run("fetch", request(`${scope}favicon.svg`)).done)).toBe("network");
  });

  it.each([
    ["a demo book", `${scope}demo/course.pdf`, "GET", "cors"],
    ["another origin", "https://elsewhere.test/drill/assets/app-1.js", "GET", "cors"],
    ["a write", `${scope}assets/app-1.js`, "POST", "cors"],
    ["a navigation to a file", `${scope}demo/course.pdf`, "GET", "navigate"],
  ])("@req PROD-003 leaves %s to the browser", (_name, url, method, mode) => {
    expect(run("fetch", request(url, { method, mode })).answered).toBe(false);
  });
});
