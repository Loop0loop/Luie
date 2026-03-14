import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const addonDir = path.resolve(repoRoot, "native", "haptics");
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
  if (!existsSync(pnpmStoreDir)) {
    throw new Error("node-gyp not found: pnpm store directory is missing");
  }

  const candidates = readdirSync(pnpmStoreDir)
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

  if (candidates.length === 0) {
    throw new Error("node-gyp not found in pnpm store");
  }

  return candidates[0];
};

const nodeGypBin = resolveNodeGypBin();
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
