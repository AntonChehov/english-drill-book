// The service worker of the app (constitution C-04). The build bundles it into `sw.js` and defines
// the two constants below: the files of the build to keep, as paths from the folder the app is
// served from, and the name of the cache, which changes with the build. It keeps the app, not the
// demo books' PDFs: a request for anything else is left to the browser untouched.

declare const APP_FILES: readonly string[];
declare const APP_CACHE: string;

const worker = self as unknown as ServiceWorkerGlobalScope;
const root = new URL(worker.registration.scope);
const kept = new Set(APP_FILES.map((file) => new URL(file, root).href));
const index = new URL("index.html", root).href;

worker.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll([...kept]))
      .then(() => worker.skipWaiting()),
  );
});

worker.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== APP_CACHE).map((name) => caches.delete(name))),
      )
      .then(() => worker.clients.claim()),
  );
});

worker.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== root.origin) return;
  // Addresses live after the hash: every navigation of the app is the one page.
  const navigation = request.mode === "navigate" && url.pathname === root.pathname;
  const file = navigation ? index : url.origin + url.pathname;
  if (!kept.has(file)) return;
  event.respondWith(caches.match(file, { ignoreVary: true }).then((hit) => hit ?? fetch(request)));
});
