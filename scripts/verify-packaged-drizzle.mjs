#!/usr/bin/env node
// Verifies that all Drizzle migration files are properly included in the packaged app.
// Run after electron-builder packaging.

import * as fs from "node:fs";
import * as path from "node:path";

const REQUIRED_RESOURCE_PATHS = [
  "drizzle/main/meta/_journal.json",
  "drizzle/cache/meta/_journal.json",
  "drizzle/cache/fts5.sql",
];

const resourcePath = process.argv[2] || process.env.APP_RESOURCES_PATH;
if (!resourcePath) {
  console.error("Usage: node verify-packaged-drizzle.mjs <resourcesPath>");
  process.exit(1);
}

let allFound = true;
for (const relPath of REQUIRED_RESOURCE_PATHS) {
  const fullPath = path.join(resourcePath, relPath);
  const found = fs.existsSync(fullPath);
  console.log(`${found ? "✓" : "✗"} ${relPath}`);
  if (!found) allFound = false;
}

// Check that at least one main migration SQL file exists
const mainDir = path.join(resourcePath, "drizzle", "main");
if (fs.existsSync(mainDir)) {
  const sqlFiles = fs.readdirSync(mainDir).filter(f => f.endsWith(".sql"));
  console.log(`${sqlFiles.length > 0 ? "✓" : "✗"} drizzle/main/*.sql (${sqlFiles.length} files)`);
  if (sqlFiles.length === 0) allFound = false;
} else {
  console.log("✗ drizzle/main/ directory missing");
  allFound = false;
}

if (allFound) {
  console.log("\n✅ All Drizzle packaging files verified");
  process.exit(0);
} else {
  console.log("\n❌ Some Drizzle packaging files are missing");
  process.exit(1);
}