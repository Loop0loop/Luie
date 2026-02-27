#!/usr/bin/env node

import fs from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = path.join(PROJECT_ROOT, "src");
const EXCEPTIONS_PATH = path.join(
  PROJECT_ROOT,
  "docs/security/security-exceptions.json",
);
const SOURCE_FILE_PATTERN = /\.(ts|tsx|js|jsx|mjs|cjs)$/;

const RULES = [
  {
    type: "eval-call",
    severity: "error",
    regex: /\beval\s*\(/g,
    message: "eval() usage is forbidden.",
  },
  {
    type: "new-function",
    severity: "error",
    regex: /\bnew Function\s*\(/g,
    message: "new Function() usage is forbidden.",
  },
  {
    type: "implied-eval-timeout",
    severity: "error",
    regex: /\bset(?:Timeout|Interval)\s*\(\s*["'`]/g,
    message: "String-based setTimeout/setInterval is forbidden.",
  },
  {
    type: "prisma-unsafe-raw",
    severity: "error",
    regex: /\.\$(?:queryRawUnsafe|executeRawUnsafe)\s*\(/g,
    message: "Prisma unsafe raw query API is forbidden.",
  },
  {
    type: "hardcoded-secret",
    severity: "error",
    regex: /\b(?:api[_-]?key|secret|token|password)\b\s*[:=]\s*["'`][^"'`\n]{8,}["'`]/gi,
    message: "Potential hardcoded secret detected.",
  },
];

const collectFiles = (dir, output = []) => {
  if (!fs.existsSync(dir)) return output;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "out") {
        continue;
      }
      collectFiles(fullPath, output);
      continue;
    }
    if (SOURCE_FILE_PATTERN.test(entry.name)) {
      output.push(fullPath);
    }
  }
  return output;
};

const getLineNumber = (content, index) =>
  content.slice(0, index).split(/\r?\n/).length;

const readExceptions = async () => {
  if (!fs.existsSync(EXCEPTIONS_PATH)) {
    return { exceptions: [] };
  }
  const raw = await readFile(EXCEPTIONS_PATH, "utf8");
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed?.exceptions)) {
    return { exceptions: [] };
  }
  return parsed;
};

const isExceptionExpired = (entry, now) => {
  if (!entry?.expiresAt) return false;
  const expiresAt = new Date(entry.expiresAt).getTime();
  return !Number.isNaN(expiresAt) && expiresAt < now.getTime();
};

const matchesException = (finding, entry) => {
  if (entry.type !== finding.type) return false;
  if (entry.file && entry.file !== finding.file) return false;
  if (!entry.pattern) return true;
  try {
    return new RegExp(entry.pattern).test(finding.text);
  } catch {
    return false;
  }
};

export const collectSecurityFindingsFromSource = (content, relativeFile) => {
  const findings = [];
  const lines = content.split(/\r?\n/);
  for (const rule of RULES) {
    for (const match of content.matchAll(rule.regex)) {
      const line = getLineNumber(content, match.index ?? 0);
      findings.push({
        type: rule.type,
        severity: rule.severity,
        message: rule.message,
        file: relativeFile,
        line,
        text: lines[line - 1]?.trim() ?? "",
      });
    }
  }
  return findings;
};

export const applySecurityExceptions = (findings, exceptions, now = new Date()) => {
  const expiredExceptions = [];
  for (const exception of exceptions) {
    if (isExceptionExpired(exception, now)) {
      expiredExceptions.push(exception);
    }
  }

  const unignoredFindings = findings.filter(
    (finding) =>
      !exceptions.some(
        (entry) => !isExceptionExpired(entry, now) && matchesException(finding, entry),
      ),
  );

  return {
    findings: unignoredFindings,
    expiredExceptions,
  };
};

export const analyzeSecurityProfile = async ({ now = new Date() } = {}) => {
  const { exceptions } = await readExceptions();
  const files = collectFiles(SRC_ROOT);
  const findings = [];

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, "utf8");
    const relativeFile = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, "/");
    findings.push(...collectSecurityFindingsFromSource(content, relativeFile));
  }

  return applySecurityExceptions(findings, exceptions, now);
};

export const runSecurityProfileCheck = async () => {
  const report = await analyzeSecurityProfile();
  let failed = false;

  if (report.expiredExceptions.length > 0) {
    failed = true;
    console.error("[check-security-profile] expired exceptions:");
    report.expiredExceptions.forEach((entry) => {
      console.error(`- ${entry.id ?? "(no-id)"} ${entry.type} ${entry.expiresAt}`);
    });
  }

  if (report.findings.length > 0) {
    failed = true;
    console.error("[check-security-profile] security findings:");
    report.findings.forEach((finding) => {
      console.error(
        `- ${finding.file}:${finding.line} [${finding.type}] ${finding.message}`,
      );
    });
  }

  if (failed) {
    return { exitCode: 1 };
  }

  console.log("[check-security-profile] OK");
  return { exitCode: 0 };
};

const isExecutedDirectly =
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isExecutedDirectly) {
  runSecurityProfileCheck()
    .then(({ exitCode }) => process.exit(exitCode))
    .catch((error) => {
      console.error(
        "[check-security-profile] failed:",
        error instanceof Error ? error.message : String(error),
      );
      process.exit(1);
    });
}
