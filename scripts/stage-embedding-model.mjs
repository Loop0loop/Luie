#!/usr/bin/env node
/**
 * stage-embedding-model.mjs
 *
 * 앱 패키징 전에 bge-m3 임베딩 GGUF 를 `resources/models/` 로 내려받아
 * electron-builder 의 extraResources(`resources/models` → `models`)로 동봉되게 한다.
 *
 * - 이미 존재하고 sha256 가 일치하면 다운로드를 건너뛴다(idempotent).
 * - 모델 파일은 git 에 커밋하지 않는다(.gitignore: resources/models/).
 * - 네트워크 실패 시 비-제로 종료로 빌드를 멈춘다(동봉 보장).
 *
 * 사용: node scripts/stage-embedding-model.mjs
 */

import { createWriteStream } from "node:fs";
import * as fsp from "node:fs/promises";
import { createHash } from "node:crypto";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// embeddingModelConstants.ts 와 값이 일치해야 한다(런타임 해석 기준).
const MODEL = {
  repo: "gpustack/bge-m3-GGUF",
  filename: "bge-m3-Q4_K_M.gguf",
  sha256: "6d39681b26c61279ac1f82db35a04a05009e94c415b51c858ff571489a82fc06",
  sizeBytes: 437_778_496,
};

const destDir = path.join(repoRoot, "resources", "models");
const destPath = path.join(destDir, MODEL.filename);
const url = `https://huggingface.co/${MODEL.repo}/resolve/main/${MODEL.filename}`;

async function sha256File(filePath) {
  const hash = createHash("sha256");
  const handle = await fsp.open(filePath, "r");
  try {
    for await (const chunk of handle.readableWebStream()) {
      hash.update(Buffer.from(chunk));
    }
  } finally {
    await handle.close();
  }
  return hash.digest("hex");
}

async function fileMatches() {
  try {
    const stat = await fsp.stat(destPath);
    if (stat.size !== MODEL.sizeBytes) return false;
    const sha = await sha256File(destPath);
    return sha === MODEL.sha256;
  } catch {
    return false;
  }
}

async function download() {
  await fsp.mkdir(destDir, { recursive: true });
  const tmpPath = `${destPath}.tmp`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} downloading ${url}`);
  }
  const total = Number(res.headers.get("content-length") ?? MODEL.sizeBytes);
  let received = 0;
  let lastLogged = 0;
  const reader = res.body.getReader();
  const handle = await fsp.open(tmpPath, "w");
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      const buf = Buffer.from(value);
      received += buf.length;
      await handle.write(buf);
      const pct = total > 0 ? Math.floor((received / total) * 100) : 0;
      if (pct >= lastLogged + 10) {
        lastLogged = pct;
        process.stdout.write(`  bge-m3 download: ${pct}%\n`);
      }
    }
    await handle.close();
    await fsp.rename(tmpPath, destPath);
  } catch (error) {
    await handle.close().catch(() => {});
    await fsp.rm(tmpPath, { force: true }).catch(() => {});
    throw error;
  }
}

async function main() {
  if (await fileMatches()) {
    console.log(`[stage-embedding-model] already present + verified: ${destPath}`);
    return;
  }
  console.log(`[stage-embedding-model] downloading ${MODEL.filename} (~${Math.round(MODEL.sizeBytes / 1e6)}MB)...`);
  await download();
  const sha = await sha256File(destPath);
  if (sha !== MODEL.sha256) {
    await fsp.rm(destPath, { force: true }).catch(() => {});
    throw new Error(`sha256 mismatch: expected ${MODEL.sha256}, got ${sha}`);
  }
  console.log(`[stage-embedding-model] verified + staged: ${destPath}`);
}

main().catch((error) => {
  console.error(`[stage-embedding-model] FAILED: ${error.message}`);
  process.exit(1);
});
