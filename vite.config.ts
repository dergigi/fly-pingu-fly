import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const DAY_SECONDS = 60 * 60 * 24;

export default defineConfig({
  plugins: [
    VitePWA({
      strategies: "generateSW",
      registerType: "autoUpdate",
      injectRegister: null,
      includeAssets: ["pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Fly Pingu Fly",
        short_name: "Fly Pingu Fly",
        description: "One-button ski jump — launch the penguin and fly far!",
        theme_color: "#8ed8f8",
        background_color: "#8ed8f8",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        navigateFallback: "index.html",
        // App shell only — game media under /assets/ uses runtime caching.
        globPatterns: [
          "**/*.{js,css,html,webmanifest,ico,svg}",
          "pwa-*.png",
        ],
        // Phaser + workbox-window hashed chunks can exceed the 2 MiB default.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: {
              cacheName: "pages-network-first",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 16,
                maxAgeSeconds: 7 * DAY_SECONDS,
              },
            },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith("/assets/"),
            handler: "NetworkFirst",
            options: {
              cacheName: "game-assets-network-first",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 64,
                maxAgeSeconds: 7 * DAY_SECONDS,
              },
            },
          },
        ],
      },
    }),
  ],
});
