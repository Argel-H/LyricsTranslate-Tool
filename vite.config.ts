import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import packageJson from "./package.json" with { type: "json" };

/**
 * User-Agent sent with MusicBrainz-adjacent requests (kept exported for
 * future proxy/worker use; currently no dev proxy consumes it).
 */
export const USER_AGENT = `${packageJson.name}/${packageJson.version} (lyricstranslate@tool.com)`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
            return "vendor-react";
          }
          if (id.includes("node_modules/framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("node_modules/dexie")) {
            return "vendor-dexie";
          }
          if (id.includes("node_modules/@tanstack")) {
            return "vendor-query";
          }
        },
      },
    },
  },
  server: {
    proxy: {
      "/api-lrclib": {
        target: "https://lrclib.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-lrclib/, ""),
      },
    },
  },
});
