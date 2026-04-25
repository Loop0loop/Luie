import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/main/database/schema.ts",
  out: "./drizzle/main",
  breakpoints: true,
  strict: true,
  verbose: true,
});
