import { createApp } from "vue";
import App from "./App.vue";
import { createAppRouter } from "./router";
import { getStore } from "./storage";
import "./styles/base.css";

// The store is opened at once on every view, so data of a newer version stops the app wherever it
// starts (design D5 of `storage`); a store that cannot be opened is said where it is used.
getStore().catch(() => undefined);

createApp(App).use(createAppRouter()).mount("#app");
