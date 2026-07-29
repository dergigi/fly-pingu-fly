import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

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
    }),
  ],
});
