import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import packageJson from "./package.json";

const USER_AGENT = `${packageJson.name}/${packageJson.version} (lyricstranslate@tool.com)`;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api-translate": {
        target: "https://api.simplytranslate.ai",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-translate/, ""),
      },
      "/api-deezer": {
        target: "https://api.deezer.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-deezer/, ""),
      },
      "/api-lrclib": {
        target: "https://lrclib.net",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-lrclib/, ""),
      },
      "/api-odesli": {
        target: "https://api.song.link",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-odesli/, ""),
      },
      "/api-musicbrainz": {
        target: "https://musicbrainz.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-musicbrainz/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("User-Agent", USER_AGENT);
          });
        },
      },
      "/api-musicbrainz-artist": {
        target: "https://musicbrainz.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-musicbrainz-artist/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("User-Agent", USER_AGENT);
            proxyReq.setHeader("Accept", "application/json");
            proxyReq.removeHeader("Origin");
            proxyReq.removeHeader("Referer");
          });
        },
      },
    },
  },
});
