import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import http from "node:http";

test("template selector visual snapshot @visual", async ({ page }) => {
  const rootDir = path.join(process.cwd(), "out", "renderer");
  const indexPath = path.join(rootDir, "index.html");
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Built renderer not found at ${indexPath}`);
  }

  const server = http.createServer((req, res) => {
    const urlPath = new URL(req.url ?? "/", "http://localhost").pathname;
    const filePath = path.join(rootDir, urlPath === "/" ? "index.html" : urlPath);

    if (!filePath.startsWith(rootDir) || !fs.existsSync(filePath)) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath);
    const contentType =
      ext === ".html"
        ? "text/html"
        : ext === ".js"
          ? "text/javascript"
          : ext === ".css"
            ? "text/css"
            : ext === ".woff2"
              ? "font/woff2"
              : ext === ".json"
                ? "application/json"
                : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.end(fs.readFileSync(filePath));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  try {
    await page.addInitScript(() => {
      const defaultEditor = {
        fontFamily: "serif",
        fontPreset: "default",
        fontSize: 18,
        lineHeight: 1.8,
        maxWidth: 800,
        theme: "light",
      };

      const windowApi = window as Window & { api?: Record<string, unknown> };
      windowApi.api = {
        project: {
          create: async () => ({ success: false, error: { message: "not supported" } }),
          get: async () => ({ success: false, error: { message: "not supported" } }),
          getAll: async () => ({ success: true, data: [] }),
          update: async () => ({ success: false, error: { message: "not supported" } }),
          delete: async () => ({ success: false, error: { message: "not supported" } }),
        },
        chapter: {
          create: async () => ({ success: false, error: { message: "not supported" } }),
          get: async () => ({ success: false, error: { message: "not supported" } }),
          getAll: async () => ({ success: true, data: [] }),
          update: async () => ({ success: false, error: { message: "not supported" } }),
          delete: async () => ({ success: false, error: { message: "not supported" } }),
          reorder: async () => ({ success: false, error: { message: "not supported" } }),
        },
        character: {
          create: async () => ({ success: false, error: { message: "not supported" } }),
          get: async () => ({ success: false, error: { message: "not supported" } }),
          getAll: async () => ({ success: true, data: [] }),
          update: async () => ({ success: false, error: { message: "not supported" } }),
          delete: async () => ({ success: false, error: { message: "not supported" } }),
        },
        term: {
          create: async () => ({ success: false, error: { message: "not supported" } }),
          get: async () => ({ success: false, error: { message: "not supported" } }),
          getAll: async () => ({ success: true, data: [] }),
          update: async () => ({ success: false, error: { message: "not supported" } }),
          delete: async () => ({ success: false, error: { message: "not supported" } }),
        },
        snapshot: {
          create: async () => ({ success: false, error: { message: "not supported" } }),
          getAll: async () => ({ success: true, data: [] }),
          restore: async () => ({ success: false, error: { message: "not supported" } }),
          delete: async () => ({ success: false, error: { message: "not supported" } }),
        },
        fs: {
          saveProject: async () => ({ success: false, error: { message: "not supported" } }),
          selectDirectory: async () => ({ success: false, error: { message: "not supported" } }),
          selectSaveLocation: async () => ({ success: false, error: { message: "not supported" } }),
          readFile: async () => ({ success: false, error: { message: "not supported" } }),
          readLuieEntry: async () => ({ success: false, error: { message: "not supported" } }),
          writeFile: async () => ({ success: false, error: { message: "not supported" } }),
          createLuiePackage: async () => ({ success: false, error: { message: "not supported" } }),
          writeProjectFile: async () => ({ success: false, error: { message: "not supported" } }),
        },
        search: async () => ({ success: true, data: [] }),
        autoSave: async () => ({ success: true, data: null }),
        settings: {
          getAll: async () => ({ success: true, data: { editor: defaultEditor } }),
          getEditor: async () => ({ success: true, data: defaultEditor }),
          setEditor: async (settings: unknown) => ({ success: true, data: settings }),
          getAutoSave: async () => ({ success: true, data: { enabled: true, interval: 30 } }),
          setAutoSave: async () => ({ success: true, data: { enabled: true, interval: 30 } }),
          getWindowBounds: async () => ({ success: true, data: undefined }),
          setWindowBounds: async () => ({ success: true, data: { width: 0, height: 0, x: 0, y: 0 } }),
          reset: async () => ({ success: true, data: { editor: defaultEditor } }),
        },
        window: {
          maximize: async () => ({ success: true, data: null }),
          toggleFullscreen: async () => ({ success: true, data: null }),
          setFullscreen: async () => ({ success: true, data: null }),
        },
        logger: {
          debug: async () => ({ success: true, data: null }),
          info: async () => ({ success: true, data: null }),
          warn: async () => ({ success: true, data: null }),
          error: async () => ({ success: true, data: null }),
        },
      };
    });

    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "domcontentloaded" });

    await page.addStyleTag({
      content: "*,:before,:after{animation:none!important;transition:none!important}",
    });

    const template = page.getByTestId("template-selector");
    const editor = page.getByTestId("editor");

    await Promise.race([
      template.waitFor({ state: "visible" }),
      editor.waitFor({ state: "visible" }),
    ]);

    if (await template.isVisible()) {
      expect(await template.screenshot()).toMatchSnapshot("template-selector.png");
    } else {
      await expect(editor).toBeVisible();
      expect(await editor.screenshot()).toMatchSnapshot("editor.png");
    }
  } finally {
    server.close();
  }

});
