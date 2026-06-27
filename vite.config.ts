import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

// NODE_ENV is explicitly set to "development" by the dev script.
// For Appflow/production builds, vite build sets it to "production".
// Use "./" for production so Capacitor can load assets from device filesystem.
const isProd = process.env.NODE_ENV === "production";

export default defineConfig({
  plugins: [
    react(),
    ...(process.env.NODE_ENV !== "production"
      ? [runtimeErrorOverlay()]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  base: isProd ? "./" : "/",
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Keep ALL third-party code in a single vendor chunk. Splitting
        // node_modules across multiple chunks broke module init order
        // (circular deps -> blank screen). One vendor chunk preserves the
        // original (working) init order while still keeping every emitted
        // file under 1 MB (vendor ~0.85 MB, app ~0.42 MB).
        manualChunks(id) {
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
