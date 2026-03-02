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
      rollupOptions: {
        input: {
          index: resolve("src/renderer/index.html"),
          "auth-result": resolve("src/renderer/auth-result.html"),
        },
      },
    },
  },
});
