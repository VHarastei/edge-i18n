import { resolve } from "node:path";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
  plugins: [
    dts({
      include: ["src"],
      exclude: ["src/example"],
    }),
  ],
  publicDir: false,
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, "src/index.ts"),
        react: resolve(__dirname, "src/react.ts"),
      },
      formats: ["es"],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: ["react", "react-dom", "react/jsx-runtime"],
      output: {
        exports: "named",
        chunkFileNames: "[name].js",
        manualChunks(id) {
          if (id.includes("src/core/") || id.includes("src/utils/")) {
            return "core";
          }
        },
      },
    },
    minify: "esbuild",
    target: "esnext",
  },
});
