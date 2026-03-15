import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { resolve } from "path";

const isDebugProfileBuild = process.env.LUIE_DEBUG_PROFILE === "1";
type PackageMetadata = {
  version: string;
  name?: string;
  productName?: string;
  build?: {
    productName?: string;
  };
};
const packageMetadata = JSON.parse(
  readFileSync(resolve("package.json"), "utf8"),
) as PackageMetadata;
const appVersion = packageMetadata.version;
const appName =
  packageMetadata.build?.productName ??
  packageMetadata.productName ??
  packageMetadata.name ??
  "Luie";
const sharedDefine = {
  __APP_VERSION__: JSON.stringify(appVersion),
  __APP_NAME__: JSON.stringify(appName),
};

const isNodeModule = (id: string): boolean => id.includes("/node_modules/");
const rendererManualChunks = (id: string): string | undefined => {
  if (isNodeModule(id)) {
    if (
      id.includes("/react/") ||
      id.includes("/react-dom/") ||
      id.includes("/scheduler/") ||
      id.includes("/zustand/") ||
      id.includes("/i18next") ||
      id.includes("/react-i18next")
    ) {
      return "vendor-react";
    }
    if (
      id.includes("/@tiptap/") ||
      id.includes("/prosemirror-")
    ) {
      return "vendor-editor";
    }
    if (
      id.includes("/reactflow/") ||
      id.includes("/dagre/")
    ) {
      return "vendor-graph";
    }
    if (
      id.includes("/@dnd-kit/") ||
      id.includes("/react-resizable-panels/")
    ) {
      return "vendor-workspace";
    }
    if (
      id.includes("/lucide-react/") ||
      id.includes("/clsx/") ||
      id.includes("/tailwind-merge/")
    ) {
      return "vendor-ui";
    }
    if (
      id.includes("/@supabase/") ||
      id.includes("/zod/") ||
      id.includes("/jszip/") ||
      id.includes("/docx/") ||
      id.includes("/dompurify/") ||
      id.includes("/diff/")
    ) {
      return "vendor-data";
    }
    return undefined;
  }
  return undefined;
};

export default defineConfig({
  main: {
    define: sharedDefine,
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
    define: sharedDefine,
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
    define: sharedDefine,
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
      cssCodeSplit: true,
      chunkSizeWarningLimit: 400,
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          "auth-result": resolve("src/renderer/auth-result.html"),
        },
        output: {
          manualChunks: rendererManualChunks,
          assetFileNames: (assetInfo) => {
            const assetName = assetInfo.names[0] ?? assetInfo.originalFileNames[0] ?? "asset";
            if (/\.(woff2?|ttf|otf)$/i.test(assetName)) {
              return "assets/fonts/[name]-[hash][extname]";
            }
            if (/\.css$/i.test(assetName)) {
              return "assets/styles/[name]-[hash][extname]";
            }
            return "assets/[name]-[hash][extname]";
          },
          chunkFileNames: "assets/chunks/[name]-[hash].js",
          entryFileNames: "assets/[name]-[hash].js",
        },
      },
    },
  },
});
