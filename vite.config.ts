import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react({
      // Use automatic JSX runtime for React 17+
      jsxRuntime: "automatic",
    }),
  ],
  css: {
    preprocessorOptions: {
      scss: {
        silenceDeprecations: ["color-functions", "global-builtin", "import", "if-function"],
      },
    },
  },
  server: {
    allowedHosts: ["gaming.emu-ordinal.ts.net"],
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        template: resolve(__dirname, "template.html"),
      },
    },
  },
});
