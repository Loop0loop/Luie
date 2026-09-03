import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const readPackage = (name) => {
  const packagePath = require.resolve(`${name}/package.json`);
  return {
    dir: dirname(packagePath),
    version: JSON.parse(readFileSync(packagePath, "utf8")).version,
  };
};

const electron = readPackage("electron");
const betterSqlite = readPackage("better-sqlite3");
const electronAbi = readFileSync(join(electron.dir, "abi_version"), "utf8").trim();

// electron-builder가 npmRebuild: false라 패키징 시 네이티브 모듈을 다시 빌드하지
// 않는다. x64 러너에서 arm64 패키지를 만들 때는 이 스크립트가 대상 아치로 미리
// 빌드해 둬야 하므로 CI 매트릭스가 ELECTRON_REBUILD_ARCH로 대상을 지정한다.
const targetArch = (process.env.ELECTRON_REBUILD_ARCH ?? "").trim() || process.arch;

// exports 필드가 ./package.json 노출을 막으므로 main 진입점에서 패키지 루트를 역산한다.
const electronRebuildDir = join(dirname(require.resolve("@electron/rebuild")), "..");
const electronRebuildManifest = JSON.parse(
  readFileSync(join(electronRebuildDir, "package.json"), "utf8"),
);
const electronRebuildBin = join(
  electronRebuildDir,
  typeof electronRebuildManifest.bin === "string"
    ? electronRebuildManifest.bin
    : electronRebuildManifest.bin["electron-rebuild"],
);

// better-sqlite3 13은 N-API 프리빌트를 플랫폼별로 제공하고 로더가 build/Release보다
// prebuilds/를 먼저 쓴다. Node ABI 기준 추측 대신 실제 Electron 런타임에서 로딩되는지를
// 직접 확인하는 것이 정확하다. ELECTRON_RUN_AS_NODE는 개발용 전자 바이너리에서만 쓰므로
// 패키징된 앱의 runAsNode 퓨즈와 무관하다.
const betterSqliteEntry = require.resolve("better-sqlite3");
const loadProbe = `const Database = require(${JSON.stringify(betterSqliteEntry)});
const database = new Database(":memory:");
database.exec("CREATE TABLE probe (value TEXT)");
database.close();
`;

const electronPath = (() => {
  try {
    return require("electron");
  } catch {
    return null;
  }
})();

const probeResult =
  electronPath === null
    ? { status: 1, stderr: "electron binary path unavailable" }
    : spawnSync(electronPath, ["-e", loadProbe], {
        stdio: ["ignore", "ignore", "pipe"],
        encoding: "utf8",
        env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" },
      });

if (probeResult.status === 0) {
  console.log(
    `electron-rebuild skipped: better-sqlite3 ${betterSqlite.version} binary loads under Electron ${electron.version} ABI ${electronAbi} (${targetArch})`,
  );
  process.exit(0);
}

console.log(
  `electron-rebuild required: better-sqlite3 ${betterSqlite.version}, Electron ${electron.version} ABI ${electronAbi}`,
);
if (probeResult.stderr?.trim()) {
  console.error(probeResult.stderr.trim());
}

// Windows에는 pnpm 네이티브 실행 파일이 없어 셸 없이 spawnSync("pnpm")를 호출하면
// ENOENT로 실패한다. 셸/PATH 의존을 없애려고 CLI 진입점을 node로 직접 실행한다.
const result = spawnSync(
  process.execPath,
  [
    electronRebuildBin,
    "--force",
    "--arch",
    targetArch,
    "-w",
    "better-sqlite3",
    "--build-from-source",
  ],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      CXXFLAGS:
        "-std=c++20 -DV8_ENABLE_SANDBOX=1 -DV8_31BIT_SMIS_ON_64BIT_ARCH=1",
    },
  },
);

process.exit(result.status ?? 1);
