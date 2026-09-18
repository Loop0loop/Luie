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
const mainExternal = [
  "electron",
  /^drizzle-orm(?:\/.*)?$/,
  /^better-sqlite3(?:\/.*)?$/,
  /^sqlite-vec(?:\/.*)?$/,
];

const isNodeModule = (id: string): boolean => id.includes("/node_modules/");

// pnpm 레이아웃(node_modules/.pnpm/<pkg>@<ver>_<peers>/node_modules/<pkg>/...)에서
// 마지막 node_modules 뒤의 실제 패키지 디렉터리를 패키지 경계 단위로 추출한다.
// substring 매칭(id.includes("/react/"))은 "/@tiptap/react/" 같은 경로도 흡수해
// @tiptap/react가 vendor-react에 편입되고 prosemirror까지 부트 청크로 당겨지는
// 버그의 원인이었다(docs/architecture/startup-pipeline-dissection.md §5b).
const resolvePackageName = (id: string): string | undefined => {
  const lastNodeModules = id.lastIndexOf("/node_modules/");
  if (lastNodeModules === -1) {
    return undefined;
  }
  const [first, second] = id.slice(lastNodeModules + "/node_modules/".length).split("/");
  if (!first) {
    return undefined;
  }
  return first.startsWith("@") ? `${first}/${second}` : first;
};

const VENDOR_REACT_PACKAGES = new Set([
  "react",
  "react-dom",
  "scheduler",
  "zustand",
  "i18next",
  "react-i18next",
  "i18next-browser-languagedetector",
]);
const VENDOR_GRAPH_PACKAGES = new Set(["reactflow", "dagre"]);
const VENDOR_WORKSPACE_PACKAGES = new Set([
  "@dnd-kit/core",
  "@dnd-kit/sortable",
  "@dnd-kit/utilities",
  "react-resizable-panels",
]);
const VENDOR_UI_PACKAGES = new Set(["lucide-react", "clsx", "tailwind-merge"]);
const VENDOR_DATA_PACKAGES = new Set([
  "@supabase/supabase-js",
  "@supabase/auth-js",
  "@supabase/realtime-js",
  "@supabase/storage-js",
  "@supabase/functions-js",
  "@supabase/gotrue-js",
  "jszip",
  "docx",
  "dompurify",
  "diff",
]);
const VENDOR_SCHEMA_PACKAGES = new Set(["zod"]);

const rendererManualChunks = (id: string): string | undefined => {
  if (!isNodeModule(id)) {
    return undefined;
  }
  const packageName = resolvePackageName(id);
  if (!packageName) {
    return undefined;
  }
  if (VENDOR_REACT_PACKAGES.has(packageName)) {
    return "vendor-react";
  }
  if (packageName.startsWith("@tiptap/")) {
    return "vendor-tiptap";
  }
  if (packageName.startsWith("prosemirror-")) {
    return "vendor-prosemirror";
  }
  if (VENDOR_GRAPH_PACKAGES.has(packageName)) {
    return "vendor-graph";
  }
  if (VENDOR_WORKSPACE_PACKAGES.has(packageName)) {
    return "vendor-workspace";
  }
  if (VENDOR_UI_PACKAGES.has(packageName)) {
    return "vendor-ui";
  }
  if (VENDOR_DATA_PACKAGES.has(packageName)) {
    return "vendor-data";
  }
  if (VENDOR_SCHEMA_PACKAGES.has(packageName)) {
    return "vendor-schema";
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
      rollupOptions: {
        input: {
          index: resolve("src/main/index.ts"),
          utilityProcessMain: resolve("src/main/utility/index.ts"),
        },
        external: mainExternal,
        output: {
          format: "es",
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
        external: ["electron"],
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
      chunkSizeWarningLimit: 500,
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
