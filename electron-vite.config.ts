// electron.vite.config.ts
import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/postcss"; 

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/main",
      sourcemap: false,
      emptyOutDir: true,
      minify: true,
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: "out/preload",
      sourcemap: false,
      emptyOutDir: true,
      minify: true,
    },
  },
  renderer: {
    plugins: [react()],
    
    css: {
      postcss: {
        plugins: [
          tailwindcss(), 
        ],
      },
    },
    // 👆👆👆 여기까지
    
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
      },
    },
    build: {
      outDir: "out/renderer",
      sourcemap: false,
      emptyOutDir: true,
      minify: "esbuild",
    },
  },
});