import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

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
            proxyReq.setHeader(
              "User-Agent",
              "LyricsTranslateTool/1.0.0 (lyricstranslate@tool.com)",
            );
          });
        },
      },
      "/api-musicbrainz-artist": {
        target: "https://musicbrainz.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-musicbrainz-artist/, ""),
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            // 1. Seteas el User-Agent obligatorio
            proxyReq.setHeader(
              "User-Agent",
              "LyricsTranslateTool/1.0.0 (lyricstranslate@tool.com)",
            );

            // 2. Le dices explícitamente que esperas un JSON
            proxyReq.setHeader("Accept", "application/json");

            // 3. EL TRUCO: Eliminamos las cabeceras de localhost que alertan a Cloudflare
            proxyReq.removeHeader("Origin");
            proxyReq.removeHeader("Referer");
          });
        },
      },
    },
  },
});
