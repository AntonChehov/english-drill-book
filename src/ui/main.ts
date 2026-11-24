import { createApp } from "vue";
import App from "./App.vue";
import { createAppRouter } from "./router";
import { getStore } from "./storage";
import { applyTheme, storedTheme } from "./theme";
import "./styles/base.css";

// The store is opened at once on every view, so data of a newer version stops the app wherever it
// starts (design D5 of `storage`); a store that cannot be opened is said where it is used.
getStore().catch(() => undefined);

// The stored theme is applied before the first screen is drawn (PROD-005).
applyTheme(await storedTheme(async () => (await getStore()).getSetting("theme")));

createApp(App).use(createAppRouter()).mount("#app");

// The service worker keeps the app for offline use (design D1 of `shell-offline-themes`, PROD-003).
// It is registered after the first screen, in the built app only; a browser that cannot or will
// not run it leaves the app as it was.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => undefined);
}
