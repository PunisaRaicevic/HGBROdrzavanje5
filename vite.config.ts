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
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("firebase")) return "vendor-firebase";
          if (id.includes("@ionic") || id.includes("ionicons"))
            return "vendor-ionic";
          if (id.includes("@capacitor")) return "vendor-capacitor";
          if (id.includes("recharts") || id.includes("d3-"))
            return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("jspdf")) return "vendor-jspdf";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("i18next")) return "vendor-i18n";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("@google") || id.includes("@googlemaps"))
            return "vendor-google";
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/scheduler/") ||
            id.includes("/wouter/") ||
            id.includes("react-hook-form")
          )
            return "vendor-react";
          return "vendor";
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
