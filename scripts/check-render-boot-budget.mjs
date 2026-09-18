#!/usr/bin/env node
// 렌더러 부트 페이로드 예산 게이트.
// index.html이 modulepreload/script/stylesheet로 첫 로드에 강제하는 자산 합계를 실측해
// docs/architecture/startup-pipeline-dissection.md §5b의 SLO 예산과 대조한다.
// 사전 조건: `pnpm build` 완료(out/renderer 존재). qa 파이프라인에는 넣지 않고
// 빌드 산출물 회귀 확인용으로만 사용한다.

import { statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const RENDERER_DIR = path.resolve(process.cwd(), "out", "renderer");

// Phase B-1(2026-09-05)에서 manualChunks segment 매칭 수정 + zod 분리로
// 1,111.1 KB → 573.1 KB로 축소됐다. 개선 수치를 기준선으로 고정한다.
const BUDGET = {
  bootJsBytes: 600 * 1024,
  bootCssBytes: 170 * 1024,
};

// Phase B 이후 하드 게이트로 승격할 항목: 현재는 존재만 보고한다.
const REPORT_ONLY_CHUNKS = ["vendor-prosemirror", "vendor-data"];

const collectAssetPaths = (html) => {
  const moduleScripts = [...html.matchAll(/<script[^>]+src="\.\/(assets\/[^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  const preloads = [...html.matchAll(/<link[^>]+modulepreload[^>]+href="\.\/(assets\/[^"]+\.js)"/g)].map(
    (m) => m[1],
  );
  const stylesheets = [...html.matchAll(/<link[^>]+stylesheet[^>]+href="\.\/(assets\/[^"]+\.css)"/g)].map(
    (m) => m[1],
  );
  return {
    bootJs: [...new Set([...moduleScripts, ...preloads])],
    bootCss: [...new Set(stylesheets)],
  };
};

const sumBytes = (paths) =>
  paths.reduce((total, relative) => total + statSync(path.join(RENDERER_DIR, relative)).size, 0);

const formatKb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

const main = async () => {
  const htmlPath = path.join(RENDERER_DIR, "index.html");
  let html;
  try {
    html = await readFile(htmlPath, "utf8");
  } catch {
    console.error("out/renderer/index.html not found. Run `pnpm build` first.");
    process.exit(2);
  }

  const { bootJs, bootCss } = collectAssetPaths(html);
  const bootJsBytes = sumBytes(bootJs);
  const bootCssBytes = sumBytes(bootCss);

  console.log(`Boot JS  : ${formatKb(bootJsBytes)} (${bootJs.length} files, budget ${formatKb(BUDGET.bootJsBytes)})`);
  console.log(`Boot CSS : ${formatKb(bootCssBytes)} (${bootCss.length} files, budget ${formatKb(BUDGET.bootCssBytes)})`);

  const offenders = REPORT_ONLY_CHUNKS.filter((name) =>
    bootJs.some((asset) => asset.includes(name)),
  );
  if (offenders.length > 0) {
    console.warn(
      `[report-only] boot preload에 에디터/export 계열 청크 포함(Phase B에서 하드 게이트로 승격 예정): ${offenders.join(", ")}`,
    );
  }

  const failures = [];
  if (bootJsBytes > BUDGET.bootJsBytes) {
    failures.push(`boot JS ${formatKb(bootJsBytes)} exceeds budget ${formatKb(BUDGET.bootJsBytes)}`);
  }
  if (bootCssBytes > BUDGET.bootCssBytes) {
    failures.push(`boot CSS ${formatKb(bootCssBytes)} exceeds budget ${formatKb(BUDGET.bootCssBytes)}`);
  }

  if (failures.length > 0) {
    console.error(`RENDER_BOOT_BUDGET_FAILED: ${failures.join("; ")}`);
    process.exit(1);
  }
  console.log("RENDER_BOOT_BUDGET_OK");
};

main();
