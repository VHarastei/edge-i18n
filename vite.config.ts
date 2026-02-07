import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dev server config for running the example
export default defineConfig({
  root: "example",
  plugins: [react()],
  resolve: {
    alias: {
      "edge-i18n/react": path.resolve(__dirname, "src/react.ts"),
      "edge-i18n": path.resolve(__dirname, "src/index.ts"),
    },
  },
  publicDir: path.resolve(__dirname, "example/public"),
});
