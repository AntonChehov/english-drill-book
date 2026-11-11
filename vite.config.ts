import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";

/**
 * Content-Security-Policy for the production build (constitution C-02).
 * GitHub Pages cannot set response headers, so the policy is a meta tag.
 * It is left out of the dev server, which injects styles inline for hot reload.
 */
export const contentSecurityPolicy = "default-src 'self'; base-uri 'self'; object-src 'none'";

function contentSecurityPolicyMeta(): Plugin {
  return {
    name: "content-security-policy-meta",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { "http-equiv": "Content-Security-Policy", content: contentSecurityPolicy },
        injectTo: "head-prepend",
      },
    ],
  };
}

export default defineConfig({
  // The demo is served from a subpath on GitHub Pages; the deploy workflow sets BASE_PATH.
  base: process.env["BASE_PATH"] ?? "/",
  plugins: [vue(), contentSecurityPolicyMeta()],
  build: {
    // scripts/size.mjs reads the manifest to find what the first screen loads.
    manifest: true,
  },
});
