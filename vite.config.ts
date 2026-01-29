import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server config for running the example
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "edge-i18n/react": "/src/react.ts",
      "edge-i18n": "/src/index.ts",
    },
  },
});
