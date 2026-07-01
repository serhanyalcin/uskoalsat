import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "USKO ALSAT",
        short_name: "ALSAT",
        description: "Knight Online icin GB odakli pazar yeri",
        theme_color: "#0d111b",
        background_color: "#090d16",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml"
          },
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    host: true,
    port: Number(process.env.WEB_PORT ?? 5173)
  }
});
