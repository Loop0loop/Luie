import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/main/database/cacheSchema.ts",
  out: "./drizzle/cache",
  breakpoints: true,
  strict: true,
  verbose: true,
});
