import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import tailwindcss from "@tailwindcss/vite"; // 👈 여기 추가

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
    // 👇 여기에 tailwindcss() 추가! 순서 중요하지 않으나 react 뒤에 두는 게 국룰
    plugins: [react(), tailwindcss()], 
    resolve: {
      alias: {
        "@renderer": resolve("src/renderer/src"),
        "@shared": resolve("src/shared"),
        "@styles": resolve("src/renderer/src/styles"), // (선택사항) 스타일 경로 alias 추천
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