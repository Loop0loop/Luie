import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SEMVER_PATTERN =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

const resolveTag = () => {
  const refName = (process.env.GITHUB_REF_NAME ?? "").trim();
  if (refName.length > 0) {
    return refName;
  }

  const ref = (process.env.GITHUB_REF ?? "").trim();
  if (ref.startsWith("refs/tags/")) {
    return ref.slice("refs/tags/".length);
  }

  return "";
};

const rawTag = resolveTag();
if (!rawTag) {
  console.error("[release] Missing tag. Expected workflow trigger from refs/tags/v*.");
  process.exit(1);
}

if (!rawTag.startsWith("v")) {
  console.error(`[release] Invalid tag '${rawTag}'. Tag must start with 'v' (example: v0.1.10).`);
  process.exit(1);
}

const releaseVersion = rawTag.slice(1);
if (!SEMVER_PATTERN.test(releaseVersion)) {
  console.error(
    `[release] Invalid semver '${releaseVersion}' from tag '${rawTag}'. Expected x.y.z[-prerelease][+build].`,
  );
  process.exit(1);
}

const packagePath = path.resolve(process.cwd(), "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const previousVersion =
  typeof packageJson.version === "string" ? packageJson.version : "";

if (previousVersion !== releaseVersion) {
  packageJson.version = releaseVersion;
  writeFileSync(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
  console.warn(
    `[release] Synchronized package.json version ${previousVersion || "(empty)"} -> ${releaseVersion}`,
  );
} else {
  console.log(`[release] package.json version already matches tag: ${releaseVersion}`);
}

if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `release_tag=${rawTag}\n`, "utf8");
  appendFileSync(process.env.GITHUB_OUTPUT, `release_version=${releaseVersion}\n`, "utf8");
}

