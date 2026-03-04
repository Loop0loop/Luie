#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, "package.json");
const npmrcPath = path.join(projectRoot, ".npmrc");

const ALLOWED_PREFIXES = [
  "workspace:",
  "file:",
  "link:",
  "npm:",
  "github:",
  "git+",
  "http://",
  "https://",
];

const SEMVER_EXACT_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;
const RANGE_TOKEN_PATTERN = /[\^~*><=|]/;
const CHECK_FIELDS = ["dependencies", "devDependencies", "optionalDependencies"];
const REQUIRED_PACKAGE_MANAGER = "pnpm@10.30.3";

const pkg = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
const findings = [];

for (const field of CHECK_FIELDS) {
  const deps = pkg[field] ?? {};
  for (const [name, version] of Object.entries(deps)) {
    const normalized = String(version).trim();
    const hasAllowedPrefix = ALLOWED_PREFIXES.some((prefix) =>
      normalized.startsWith(prefix),
    );
    if (hasAllowedPrefix) continue;
    if (SEMVER_EXACT_PATTERN.test(normalized)) continue;
    if (RANGE_TOKEN_PATTERN.test(normalized)) {
      findings.push(`${field}.${name} uses non-pinned range "${normalized}"`);
      continue;
    }
    findings.push(`${field}.${name} has unsupported version format "${normalized}"`);
  }
}

if (pkg.packageManager !== REQUIRED_PACKAGE_MANAGER) {
  findings.push(
    `packageManager must be "${REQUIRED_PACKAGE_MANAGER}" (current: "${pkg.packageManager ?? "missing"}")`,
  );
}

let npmrcContent = "";
try {
  npmrcContent = await fs.readFile(npmrcPath, "utf8");
} catch {
  findings.push(".npmrc is missing");
}

if (npmrcContent && !/^save-exact=true$/m.test(npmrcContent)) {
  findings.push(".npmrc must include save-exact=true");
}

if (findings.length > 0) {
  console.error("[check-version-pins] Violations found:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("[check-version-pins] OK");
