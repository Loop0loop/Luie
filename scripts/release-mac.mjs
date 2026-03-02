import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const distDir = path.join(repoRoot, "dist");

function fail(message) {
  console.error(`[release:mac] ${message}`);
  process.exit(1);
}

function runGit(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function parseGitHubRepo(remoteUrl) {
  const httpsMatch = remoteUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  const sshMatch = remoteUrl.match(/^git@github\.com:([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  const sshProtocolMatch = remoteUrl.match(/^ssh:\/\/git@github\.com\/([^/]+)\/([^/.]+)(?:\.git)?$/i);
  if (sshProtocolMatch) {
    return { owner: sshProtocolMatch[1], repo: sshProtocolMatch[2] };
  }

  return null;
}

function resolveRepo() {
  const fromEnv = process.env.GITHUB_REPOSITORY;
  if (fromEnv && fromEnv.includes("/")) {
    const [owner, repo] = fromEnv.split("/");
    if (owner && repo) return { owner, repo };
  }

  const origin = runGit(["config", "--get", "remote.origin.url"]);
  if (!origin) {
    fail("Git remote 'origin' is not configured");
  }

  const parsed = parseGitHubRepo(origin);
  if (!parsed) {
    fail(`Unsupported origin URL format: ${origin}`);
  }

  return parsed;
}

async function githubRequest(url, token, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "luie-release-mac-script",
      ...(init.headers ?? {}),
    },
  });

  return response;
}

async function githubJson(url, token, init = {}) {
  const response = await githubRequest(url, token, init);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const reason = data?.message ? `: ${data.message}` : "";
    throw new Error(`GitHub API ${response.status}${reason}`);
  }

  return data;
}

async function ensureRelease({ owner, repo, tag, token, commitish }) {
  const releaseByTagUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;

  const existingResponse = await githubRequest(releaseByTagUrl, token);
  if (existingResponse.ok) {
    return existingResponse.json();
  }

  if (existingResponse.status !== 404) {
    const body = await existingResponse.text();
    let message = body;
    try {
      const parsed = body ? JSON.parse(body) : null;
      message = parsed?.message ?? body;
    } catch {
      // keep raw body
    }
    throw new Error(`Failed to query release for ${tag}: ${existingResponse.status} ${message}`);
  }

  return githubJson(`https://api.github.com/repos/${owner}/${repo}/releases`, token, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tag_name: tag,
      name: tag,
      target_commitish: commitish,
      draft: false,
      prerelease: false,
      generate_release_notes: true,
    }),
  });
}

async function collectMacAssets(version) {
  const dirEntries = await fs.readdir(distDir, { withFileTypes: true });
  const macCandidates = dirEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => /\.(dmg|zip)$/i.test(name));

  const preferred = macCandidates.filter((name) => name.includes(version));
  const selected = (preferred.length > 0 ? preferred : macCandidates).sort((a, b) =>
    a.localeCompare(b),
  );

  if (selected.length === 0) {
    fail(`No macOS release assets (.dmg/.zip) found in ${distDir}`);
  }

  return selected.map((name) => ({
    name,
    absolutePath: path.join(distDir, name),
  }));
}

function detectMimeType(fileName) {
  if (fileName.endsWith(".dmg")) return "application/x-apple-diskimage";
  if (fileName.endsWith(".zip")) return "application/zip";
  return "application/octet-stream";
}

async function deleteExistingAssetIfNeeded({ owner, repo, releaseId, token, fileName }) {
  const assets = await githubJson(
    `https://api.github.com/repos/${owner}/${repo}/releases/${releaseId}/assets?per_page=100`,
    token,
  );

  const existing = assets.find((asset) => asset.name === fileName);
  if (!existing) return;

  const deleteResponse = await githubRequest(
    `https://api.github.com/repos/${owner}/${repo}/releases/assets/${existing.id}`,
    token,
    { method: "DELETE" },
  );

  if (deleteResponse.status !== 204) {
    const body = await deleteResponse.text();
    throw new Error(
      `Failed to delete existing asset ${fileName}: ${deleteResponse.status} ${body}`,
    );
  }

  console.log(`[release:mac] Replaced existing asset: ${fileName}`);
}

async function uploadAsset({ release, token, fileName, fileBuffer }) {
  const uploadBase = String(release.upload_url).replace(/\{.*$/, "");
  const uploadUrl = `${uploadBase}?name=${encodeURIComponent(fileName)}`;

  const uploadResponse = await githubRequest(uploadUrl, token, {
    method: "POST",
    headers: {
      "Content-Type": detectMimeType(fileName),
      "Content-Length": String(fileBuffer.length),
    },
    body: fileBuffer,
  });

  const bodyText = await uploadResponse.text();
  const body = bodyText ? JSON.parse(bodyText) : null;

  if (!uploadResponse.ok) {
    const reason = body?.message ? `: ${body.message}` : "";
    throw new Error(`Failed to upload ${fileName} (${uploadResponse.status}${reason})`);
  }

  console.log(`[release:mac] Uploaded: ${fileName}`);
}

async function main() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    fail("GITHUB_TOKEN is required for pnpm build:mac");
  }

  const packageJsonPath = path.join(repoRoot, "package.json");
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, "utf8"));
  const version = packageJson.version;
  if (!version) {
    fail("package.json version is missing");
  }

  const tag = `v${version}`;
  const { owner, repo } = resolveRepo();
  const commitish = runGit(["rev-parse", "HEAD"]);

  const assets = await collectMacAssets(version);
  console.log(`[release:mac] Target release: ${owner}/${repo} ${tag}`);
  console.log(`[release:mac] Assets: ${assets.map((asset) => asset.name).join(", ")}`);

  const release = await ensureRelease({ owner, repo, tag, token, commitish });

  for (const asset of assets) {
    const fileBuffer = await fs.readFile(asset.absolutePath);
    await deleteExistingAssetIfNeeded({
      owner,
      repo,
      releaseId: release.id,
      token,
      fileName: asset.name,
    });
    await uploadAsset({
      release,
      token,
      fileName: asset.name,
      fileBuffer,
    });
  }

  console.log(`[release:mac] Release upload completed for ${tag}`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
