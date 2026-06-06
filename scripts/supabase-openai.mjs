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
      const host =
        raw.startsWith("http://") || raw.startsWith("https://")
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
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_URL,
);
const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? "";
const geminiApiKey =
  process.env.GEMINI_API_KEY?.trim() ??
  process.env.GOOGLE_GCP_API?.trim() ??
  process.env.GOOGLE_API_KEY?.trim() ??
  "";

const writeSecretEnvFile = (tmpDir) => {
  const lines = [];
  if (openAiApiKey) {
    lines.push(`OPENAI_API_KEY=${openAiApiKey}`);
  }
  if (geminiApiKey) {
    lines.push(`GEMINI_API_KEY=${geminiApiKey}`);
  }
  if (lines.length === 0) {
    return null;
  }
  const envFilePath = join(tmpDir, "llm-proxy.env");
  writeFileSync(envFilePath, `${lines.join("\n")}\n`, {
    mode: 0o600,
  });
  return envFilePath;
};

const buildSupabaseCliEnv = () => {
  const env = { ...process.env };
  const accessToken = env.SUPABASE_ACCESS_TOKEN?.trim();
  if (accessToken && !accessToken.startsWith("sbp_")) {
    delete env.SUPABASE_ACCESS_TOKEN;
    console.warn(
      "[supabase-openai] Ignoring SUPABASE_ACCESS_TOKEN because it is not an sbp_ token. Run `pnpm exec supabase login` or set a valid sbp_ access token if remote auth is required.",
    );
  }
  return env;
};

const runSupabase = (args) => {
  const packageManagerCommand =
    process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const result = spawnSync(
    packageManagerCommand,
    ["exec", "supabase", "--workdir", "supabase", ...args],
    {
      stdio: "inherit",
      env: buildSupabaseCliEnv(),
    },
  );
  if (result.error) {
    console.error(
      "[supabase-openai] failed to run Supabase CLI:",
      result.error.message,
    );
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
    if (!openAiApiKey && !geminiApiKey) {
      console.error(
        "[supabase-openai] OPENAI_API_KEY or GEMINI_API_KEY is required. Set one locally, then rerun this command.",
      );
      process.exit(1);
    }
    const tmpDir = mkdtempSync(join(tmpdir(), "luie-supabase-secret-"));
    const envFilePath = writeSecretEnvFile(tmpDir);
    try {
      if (!envFilePath) {
        process.exit(1);
      }
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
    const openAiStatus = runSupabase([
      "functions",
      "deploy",
      "openai-proxy",
      "--project-ref",
      projectRef,
    ]);
    if (openAiStatus !== 0) {
      process.exit(openAiStatus);
    }
    process.exit(
      runSupabase([
        "functions",
        "deploy",
        "gemini-proxy",
        "--project-ref",
        projectRef,
      ]),
    );
  }
  case "serve": {
    const functionName = process.argv[3]?.trim() || "openai-proxy";
    if (!["openai-proxy", "gemini-proxy", "luieEnv"].includes(functionName)) {
      console.error(
        "[supabase-openai] serve target must be one of: openai-proxy, gemini-proxy, luieEnv",
      );
      process.exit(1);
    }
    process.exit(runSupabase(["functions", "serve", functionName]));
  }
  default: {
    console.error(
      "Usage: node scripts/supabase-openai.mjs <link|set-secret|deploy|serve [openai-proxy|gemini-proxy|luieEnv]>",
    );
    process.exit(1);
  }
}
