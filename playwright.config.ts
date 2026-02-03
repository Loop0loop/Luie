import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"]],
  use: {
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "smoke",
      grep: /@smoke/,
    },
    {
      name: "e2e",
      grep: /@e2e/,
    },
    {
      name: "stress",
      grep: /@stress/,
      timeout: 120_000,
    },
    {
      name: "visual",
      grep: /@visual/,
      use: {
        browserName: "chromium",
      },
    },
  ],
});
