import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const addonDir = path.resolve(repoRoot, "native", "haptics");
const releaseBinaryPath = path.resolve(
  addonDir,
  "build",
  "Release",
  "luie_haptics.node",
);
const pnpmStoreDir = path.resolve(repoRoot, "node_modules", ".pnpm");
const nodeGypCacheDir = path.resolve(repoRoot, ".node-gyp-cache");
const nodeDir = path.resolve(path.dirname(process.execPath), "..");

if (process.platform !== "darwin") {
  console.log("[build-native-haptics] skipping: macOS only");
  process.exit(0);
}

if (!existsSync(addonDir)) {
  console.log("[build-native-haptics] skipping: addon directory missing");
  process.exit(0);
}

const resolveNodeGypBin = () => {
  const directCandidates = [
    path.resolve(repoRoot, "node_modules", "node-gyp", "bin", "node-gyp.js"),
  ];

  for (const candidate of directCandidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  try {
    return require.resolve("node-gyp/bin/node-gyp.js");
  } catch {
    // Fall through to pnpm store lookup.
  }

  if (existsSync(pnpmStoreDir)) {
    const pnpmCandidates = readdirSync(pnpmStoreDir)
      .filter((entry) => entry.startsWith("node-gyp@"))
      .sort()
      .reverse()
      .map((entry) =>
        path.join(
          pnpmStoreDir,
          entry,
          "node_modules",
          "node-gyp",
          "bin",
          "node-gyp.js",
        ),
      )
      .filter((candidate) => existsSync(candidate));

    if (pnpmCandidates.length > 0) {
      return pnpmCandidates[0];
    }
  }

  throw new Error("node-gyp not found in node_modules");
};

const nodeGypBin = resolveNodeGypBin();
console.log(`[build-native-haptics] using node-gyp: ${path.relative(repoRoot, nodeGypBin)}`);

const result = spawnSync(process.execPath, [nodeGypBin, "rebuild"], {
  cwd: addonDir,
  stdio: "inherit",
  env: {
    ...process.env,
    npm_config_devdir: nodeGypCacheDir,
    npm_config_nodedir: nodeDir,
  },
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

if (!existsSync(releaseBinaryPath)) {
  console.error("[build-native-haptics] build completed but output binary is missing");
  process.exit(1);
}

console.log(
  `[build-native-haptics] built: ${path.relative(repoRoot, releaseBinaryPath)}`,
);
