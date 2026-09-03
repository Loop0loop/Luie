import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const sourceIconPath = path.join(repoRoot, "assets", "public", "luie.png");
const outputDir = path.join(repoRoot, "build", "icons");
const iconPngPath = path.join(outputDir, "icon.png");
const iconIcoPath = path.join(outputDir, "icon.ico");
const iconIcnsPath = path.join(outputDir, "icon.icns");
const outputPaths = [iconPngPath, iconIcoPath, iconIcnsPath];
const force = process.argv.includes("--force");

function fail(message) {
  console.error(`[generate:icons] ${message}`);
  process.exit(1);
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "pipe",
    ...options,
  });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = [stderr, stdout].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed${details ? `\n${details}` : ""}`);
  }

  return result.stdout?.trim() ?? "";
}

function hasCommand(command, checkArgs) {
  const result = spawnSync(command, checkArgs, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: "ignore",
  });
  return result.status === 0;
}

// electron-builder 26부터 app-builder 바이너리(app-builder-bin)가 제거되어
// 빌더 자체가 사용하는 JS iconConverter를 그대로 호출한다. 이 도구는 최초 1회
// electron-userland/electron-builder-binaries에서 내려받아 캐시된다.
function loadIconConverter() {
  const require = createRequire(import.meta.url);
  const electronBuilderDir = path.dirname(require.resolve("electron-builder"));
  const appBuilderLibDir = path.dirname(
    require.resolve("app-builder-lib/package.json", { paths: [electronBuilderDir] }),
  );
  return require(path.join(appBuilderLibDir, "out", "util", "iconConverter.js"));
}

function generateSquarePng() {
  if (hasCommand("ffmpeg", ["-version"])) {
    runCommand("ffmpeg", [
      "-y",
      "-i",
      sourceIconPath,
      "-vf",
      "scale=1024:1024:force_original_aspect_ratio=decrease,pad=1024:1024:(ow-iw)/2:(oh-ih)/2:color=0x00000000",
      "-pix_fmt",
      "rgba",
      iconPngPath,
    ]);
    return;
  }

  console.warn("[generate:icons] ffmpeg not found; copying source icon without square-padding normalization");
  copyFileSync(sourceIconPath, iconPngPath);
}

async function generatePlatformIcons() {
  const { convertIcon } = loadIconConverter();
  for (const format of ["ico", "icns"]) {
    const result = await convertIcon({
      sources: [iconPngPath],
      fallbackSources: [],
      roots: [repoRoot],
      format,
      outDir: outputDir,
    });
    if (!result.icons?.length) {
      throw new Error(`Icon conversion to ${format} produced no output`);
    }
  }
}

function outputsAreFresh() {
  if (!existsSync(sourceIconPath)) {
    fail(`Source icon not found: ${sourceIconPath}`);
  }

  if (!outputPaths.every((outputPath) => existsSync(outputPath))) {
    return false;
  }

  const sourceMtime = statSync(sourceIconPath).mtimeMs;
  return outputPaths.every((outputPath) => statSync(outputPath).mtimeMs >= sourceMtime);
}

function verifyOutputs() {
  const missing = outputPaths.filter((outputPath) => !existsSync(outputPath));
  if (missing.length > 0) {
    fail(`Icon generation incomplete. Missing files: ${missing.join(", ")}`);
  }
}

async function main() {
  if (!force && outputsAreFresh()) {
    console.log("[generate:icons] build/icons outputs are already up-to-date");
    return;
  }

  mkdirSync(outputDir, { recursive: true });

  try {
    generateSquarePng();
    await generatePlatformIcons();
    verifyOutputs();
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }

  console.log(`[generate:icons] Generated ${path.relative(repoRoot, iconPngPath)}`);
  console.log(`[generate:icons] Generated ${path.relative(repoRoot, iconIcoPath)}`);
  console.log(`[generate:icons] Generated ${path.relative(repoRoot, iconIcnsPath)}`);
}

main();
