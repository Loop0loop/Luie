import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

const isDebugProfileBuild = process.env.LUIE_DEBUG_PROFILE === "1";

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: ["jszip"] })],
    build: {
      outDir: "out/main",
      sourcemap: isDebugProfileBuild,
      emptyOutDir: true,
      minify: isDebugProfileBuild ? false : true,
      // V8 bytecode compilation for source code protection
      // Note: bytecode feature requires electron-vite@2.0.0+
      rollupOptions: {
        output: {
          format: 'es',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      sourcemap: isDebugProfileBuild,
      emptyOutDir: true,
      minify: isDebugProfileBuild ? false : true,
      rollupOptions: {
        input: resolve("src/preload/index.ts"),
        output: {
          format: "cjs",
          entryFileNames: "[name].cjs",
          chunkFileNames: "[name]-[hash].cjs",
        },
      },
    },
  },
  renderer: {
    plugins: [react()],
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
      },
    },
    build: {
      outDir: "out/renderer",
      sourcemap: isDebugProfileBuild,
      emptyOutDir: true,
      minify: isDebugProfileBuild ? false : "esbuild",
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          "auth-result": resolve("src/renderer/auth-result.html"),
        },
        output: {
          manualChunks: (id) => {
            if (!id.includes("node_modules")) return;

            if (
              id.includes("react") ||
              id.includes("react-dom") ||
              id.includes("scheduler")
            ) {
              return "react-vendor";
            }

            if (id.includes("@tiptap") || id.includes("prosemirror")) {
              return "editor-vendor";
            }

            if (
              id.includes("lucide-react") ||
              id.includes("clsx") ||
              id.includes("tailwind-merge")
            ) {
              return "ui-vendor";
            }

            if (id.includes("reactflow")) {
              return "graph-vendor";
            }

            return "vendor";
          },
        },
      },
    },
  },
});
