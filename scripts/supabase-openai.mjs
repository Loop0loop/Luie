#!/usr/bin/env node

import "dotenv/config";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const action = process.argv[2]?.trim();

const parseProjectRef = (...candidates) => {
  for (const candidate of candidates) {
    const raw = candidate?.trim();
    if (!raw) continue;

    try {
      const host = raw.startsWith("http://") || raw.startsWith("https://")
        ? new URL(raw).hostname
        : raw;
      const normalized = host.replace(/\/.*$/, "").replace(/^https?:\/\//i, "");
      if (normalized.endsWith(".supabase.co")) {
        const ref = normalized.slice(0, -".supabase.co".length);
        if (ref) return ref;
      }
      if (/^[a-z0-9-]+$/i.test(normalized)) {
        return normalized;
      }
    } catch {
      // try next candidate
    }
  }
  return "";
};

const projectRef = parseProjectRef(
  process.env.SUPABASE_PROJECT_REF,
  process.env.SUPADATABASE_PRJ_ID,
  process.env.SUPABASE_URL,
);
const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";

const runSupabase = (args) => {
  const result = spawnSync("pnpm", ["exec", "supabase", ...args], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error("[supabase-openai] failed to run Supabase CLI:", result.error.message);
    process.exit(1);
  }
  return result.status ?? 1;
};

const requireProjectRef = () => {
  if (!projectRef) {
    console.error(
      "[supabase-openai] SUPABASE_PROJECT_REF is required. Set it in your shell or .env first.",
    );
    process.exit(1);
  }
};

switch (action) {
  case "link": {
    requireProjectRef();
    process.exit(runSupabase(["link", "--project-ref", projectRef]));
  }
  case "set-secret": {
    requireProjectRef();
    if (!openAiApiKey) {
      console.error(
        "[supabase-openai] OPENAI_API_KEY is required. Set it locally, then rerun this command.",
      );
      process.exit(1);
    }
    const tmpDir = mkdtempSync(join(tmpdir(), "luie-supabase-secret-"));
    const envFilePath = join(tmpDir, "openai.env");
    writeFileSync(envFilePath, `OPENAI_API_KEY=${openAiApiKey}\n`, { mode: 0o600 });
    try {
      process.exit(
        runSupabase([
          "secrets",
          "set",
          "--env-file",
          envFilePath,
          "--project-ref",
          projectRef,
        ]),
      );
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }
  case "deploy": {
    requireProjectRef();
    process.exit(runSupabase(["functions", "deploy", "openai-proxy", "--project-ref", projectRef]));
  }
  case "serve": {
    process.exit(runSupabase(["functions", "serve", "openai-proxy"]));
  }
  default: {
    console.error("Usage: node scripts/supabase-openai.mjs <link|set-secret|deploy|serve>");
    process.exit(1);
  }
}
