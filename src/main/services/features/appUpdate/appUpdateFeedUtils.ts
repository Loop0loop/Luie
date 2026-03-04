import { app } from "electron";

export const UPDATE_FETCH_TIMEOUT_MS = 5000;
export const UPDATE_PAYLOAD_MAX_BYTES = 512 * 1024;
export const UPDATE_DOWNLOAD_MAX_BYTES = 1024 * 1024 * 1024;
export const DEFAULT_UPDATE_FEED_URL =
  "https://api.github.com/repos/Loop0loop/Luie/releases/latest";

const VERSION_PATTERN = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const SHA256_PATTERN = /^(?:sha256:)?[a-fA-F0-9]{64}$/;

type ParsedSemver = {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
};

export type UpdateFeedManifest = {
  version: string;
  url: string;
  sha256?: string;
  size?: number;
};

type ReleaseAsset = {
  name: string;
  url: string;
  size?: number;
  sha256?: string;
};

const normalizeVersionString = (input: string): string | null => {
  const trimmed = input.trim();
  if (!VERSION_PATTERN.test(trimmed)) return null;
  return trimmed.startsWith("v") ? trimmed.slice(1) : trimmed;
};

const parseSemver = (input: string): ParsedSemver | null => {
  const normalized = normalizeVersionString(input);
  if (!normalized) return null;
  const [core, pre] = normalized.split("-", 2);
  const [majorRaw, minorRaw, patchRaw] = core.split(".");
  const major = Number(majorRaw);
  const minor = Number(minorRaw);
  const patch = Number(patchRaw);
  if (![major, minor, patch].every((value) => Number.isInteger(value) && value >= 0)) {
    return null;
  }
  return {
    major,
    minor,
    patch,
    prerelease: pre ? pre.split(".").filter((segment) => segment.length > 0) : [],
  };
};

const comparePrereleaseSegment = (left: string, right: string): number => {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftNumber = Number(left);
    const rightNumber = Number(right);
    return leftNumber === rightNumber ? 0 : leftNumber < rightNumber ? -1 : 1;
  }
  if (leftNumeric !== rightNumeric) {
    return leftNumeric ? -1 : 1;
  }
  return left === right ? 0 : left < right ? -1 : 1;
};

export const compareSemver = (currentVersion: string, latestVersion: string): number => {
  const current = parseSemver(currentVersion);
  const latest = parseSemver(latestVersion);
  if (!current || !latest) return currentVersion.localeCompare(latestVersion);

  if (current.major !== latest.major) return current.major < latest.major ? -1 : 1;
  if (current.minor !== latest.minor) return current.minor < latest.minor ? -1 : 1;
  if (current.patch !== latest.patch) return current.patch < latest.patch ? -1 : 1;

  const currentPre = current.prerelease;
  const latestPre = latest.prerelease;
  if (currentPre.length === 0 && latestPre.length === 0) return 0;
  if (currentPre.length === 0) return 1;
  if (latestPre.length === 0) return -1;

  const maxLen = Math.max(currentPre.length, latestPre.length);
  for (let index = 0; index < maxLen; index += 1) {
    const left = currentPre[index];
    const right = latestPre[index];
    if (left === undefined) return -1;
    if (right === undefined) return 1;
    const compared = comparePrereleaseSegment(left, right);
    if (compared !== 0) return compared;
  }
  return 0;
};

export const normalizeSha256 = (input: string): string | null => {
  const trimmed = input.trim();
  if (!SHA256_PATTERN.test(trimmed)) return null;
  return trimmed.toLowerCase().replace(/^sha256:/, "");
};

const getPlatformPrefs = (): string[] =>
  process.platform === "win32"
    ? ["web-setup", ".exe", "portable"]
    : process.platform === "darwin"
      ? [".dmg", ".zip"]
      : [".appimage", ".deb", ".rpm"];

const scoreReleaseAsset = (asset: ReleaseAsset): number => {
  const platformPrefs = getPlatformPrefs();
  const arch = process.arch.toLowerCase();
  const otherArchTokens = ["x64", "arm64", "ia32"].filter((token) => token !== arch);
  const name = asset.name.toLowerCase();

  let score = 0;
  for (const pref of platformPrefs) {
    if (name.includes(pref)) {
      score += 40;
    }
  }
  if (name.includes(arch)) {
    score += 30;
  }
  if (!otherArchTokens.some((token) => name.includes(token))) {
    score += 5;
  }
  return score;
};

const pickBestReleaseAsset = (assets: ReleaseAsset[]): ReleaseAsset | null => {
  if (assets.length === 0) return null;
  return [...assets].sort((left, right) => scoreReleaseAsset(right) - scoreReleaseAsset(left))[0] ?? null;
};

const toHttpsUrl = (input: string, baseUrl: URL): URL | null => {
  try {
    const resolved = new URL(input, baseUrl);
    if (resolved.protocol !== "https:") return null;
    return resolved;
  } catch {
    return null;
  }
};

const extractGithubRepoFromApiReleaseLatestUrl = (
  feedUrl: URL,
): { owner: string; repo: string } | null => {
  if (feedUrl.hostname !== "api.github.com") return null;
  const matched = feedUrl.pathname.match(/^\/repos\/([^/]+)\/([^/]+)\/releases\/latest\/?$/i);
  if (!matched) return null;
  return {
    owner: decodeURIComponent(matched[1]),
    repo: decodeURIComponent(matched[2]),
  };
};

const extractVersionFromGithubReleasePageUrl = (releasePageUrl: URL): string | null => {
  const matched = releasePageUrl.pathname.match(/\/releases\/tag\/([^/?#]+)$/i);
  if (!matched) return null;
  return normalizeVersionString(decodeURIComponent(matched[1]));
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseReleaseAssetsFromExpandedHtml = (
  html: string,
  owner: string,
  repo: string,
  tag: string,
): ReleaseAsset[] => {
  const assetLinkPattern = new RegExp(
    `/` +
      `${escapeRegex(owner)}` +
      "/" +
      `${escapeRegex(repo)}` +
      `/releases/download/` +
      `${escapeRegex(tag)}` +
      `/([^"?#<]+)`,
    "gi",
  );
  const dedup = new Set<string>();
  const results: ReleaseAsset[] = [];
  let matched: RegExpExecArray | null;
  while ((matched = assetLinkPattern.exec(html)) !== null) {
    const rawPath = matched[0];
    const filename = decodeURIComponent(matched[1]).trim();
    if (!filename) continue;
    const assetPath = rawPath.replace(/&amp;/g, "&");
    if (dedup.has(assetPath)) continue;
    dedup.add(assetPath);
    results.push({
      name: filename,
      url: `https://github.com${assetPath}`,
    });
  }
  return results;
};

const extractVersionFromFeedPayload = (payload: unknown): string | null => {
  if (typeof payload === "string") {
    return normalizeVersionString(payload);
  }
  if (Array.isArray(payload)) {
    for (const entry of payload) {
      const candidate = extractVersionFromFeedPayload(entry);
      if (candidate) return candidate;
    }
    return null;
  }
  if (payload && typeof payload === "object") {
    const source = payload as Record<string, unknown>;
    const keyCandidates = [
      source.version,
      source.latestVersion,
      source.tag_name,
      source.tagName,
      source.name,
    ];
    for (const candidate of keyCandidates) {
      if (typeof candidate !== "string") continue;
      const normalized = normalizeVersionString(candidate);
      if (normalized) return normalized;
    }
  }
  return null;
};

const extractManifestFromFeedPayload = (
  payload: unknown,
  feedUrl: URL,
): UpdateFeedManifest | null => {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  const source = payload as Record<string, unknown>;
  const normalizedVersion = normalizeVersionString(
    typeof source.version === "string"
      ? source.version
      : typeof source.latestVersion === "string"
        ? source.latestVersion
        : typeof source.tag_name === "string"
          ? source.tag_name
          : "",
  );
  if (!normalizedVersion) return null;

  const rawUrl =
    typeof source.url === "string"
      ? source.url
      : typeof source.downloadUrl === "string"
        ? source.downloadUrl
        : typeof source.assetUrl === "string"
          ? source.assetUrl
          : null;
  const rawSha =
    typeof source.sha256 === "string"
      ? source.sha256
      : typeof source.checksum === "string"
        ? source.checksum
        : null;

  if (rawUrl) {
    let resolvedUrl: URL;
    try {
      resolvedUrl = new URL(rawUrl, feedUrl);
    } catch {
      return null;
    }
    if (resolvedUrl.protocol !== "https:") {
      return null;
    }

    const size =
      typeof source.size === "number" && Number.isFinite(source.size) && source.size > 0
        ? source.size
        : undefined;
    const normalizedSha = rawSha ? normalizeSha256(rawSha) ?? undefined : undefined;

    return {
      version: normalizedVersion,
      url: resolvedUrl.toString(),
      sha256: normalizedSha,
      size,
    };
  }

  const assetsRaw = source.assets;
  if (!Array.isArray(assetsRaw)) {
    return null;
  }

  const assets: ReleaseAsset[] = assetsRaw
    .map((asset): ReleaseAsset | null => {
      if (!asset || typeof asset !== "object" || Array.isArray(asset)) return null;
      const item = asset as Record<string, unknown>;
      const name = typeof item.name === "string" ? item.name : "";
      const url =
        typeof item.browser_download_url === "string" ? item.browser_download_url : "";
      if (!name || !url) return null;
      const digest =
        typeof item.digest === "string"
          ? item.digest
          : typeof item.sha256 === "string"
            ? item.sha256
            : typeof item.checksum === "string"
              ? item.checksum
              : undefined;
      const normalizedSha = digest ? normalizeSha256(digest) ?? undefined : undefined;
      const size =
        typeof item.size === "number" && Number.isFinite(item.size) && item.size > 0
          ? item.size
          : undefined;
      return {
        name,
        url,
        size,
        sha256: normalizedSha,
      };
    })
    .filter((asset): asset is ReleaseAsset => Boolean(asset));

  if (assets.length === 0) {
    return null;
  }

  const best = pickBestReleaseAsset(assets);
  if (!best) return null;
  const resolvedUrl = toHttpsUrl(best.url, feedUrl);
  if (!resolvedUrl) return null;

  return {
    version: normalizedVersion,
    url: resolvedUrl.toString(),
    sha256: best.sha256,
    size: best.size,
  };
};

const extractVersionFromTextPayload = (raw: string): string | null => {
  const matched = raw.match(/v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?/);
  if (!matched) return null;
  return normalizeVersionString(matched[0]);
};

const buildFeedHeaders = (feedUrl: URL): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain;q=0.9",
    "User-Agent": `Luie-Updater/${app.getVersion()}`,
  };

  if (feedUrl.hostname === "api.github.com") {
    headers.Accept = "application/vnd.github+json";
    headers["X-GitHub-Api-Version"] = "2022-11-28";
  }

  return headers;
};

const fetchGithubReleaseFallback = async (
  feedUrl: URL,
): Promise<{ latestVersion: string; manifest: UpdateFeedManifest | null } | null> => {
  const repo = extractGithubRepoFromApiReleaseLatestUrl(feedUrl);
  if (!repo) return null;

  const latestReleaseUrl = new URL(
    `https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/releases/latest`,
  );
  const latestResponse = await fetch(latestReleaseUrl, {
    method: "GET",
    headers: buildFeedHeaders(latestReleaseUrl),
  });
  if (!latestResponse.ok) {
    return null;
  }

  const latestPageUrl = toHttpsUrl(latestResponse.url, latestReleaseUrl);
  if (!latestPageUrl) {
    return null;
  }

  const latestTagRaw = latestPageUrl.pathname.split("/").pop();
  if (!latestTagRaw) {
    return null;
  }
  const latestTag = decodeURIComponent(latestTagRaw);
  const latestVersion =
    extractVersionFromGithubReleasePageUrl(latestPageUrl) ?? normalizeVersionString(latestTag);
  if (!latestVersion) {
    return null;
  }

  const assetsUrl = new URL(
    `https://github.com/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}/releases/expanded_assets/${encodeURIComponent(
      latestTag,
    )}`,
  );
  const assetsResponse = await fetch(assetsUrl, {
    method: "GET",
    headers: buildFeedHeaders(assetsUrl),
  });
  if (!assetsResponse.ok) {
    return {
      latestVersion,
      manifest: null,
    };
  }

  const html = await assetsResponse.text();
  const assets = parseReleaseAssetsFromExpandedHtml(html, repo.owner, repo.repo, latestTag);
  const best = pickBestReleaseAsset(assets);
  if (!best) {
    return {
      latestVersion,
      manifest: null,
    };
  }
  const resolvedUrl = toHttpsUrl(best.url, assetsUrl);
  if (!resolvedUrl) {
    return {
      latestVersion,
      manifest: null,
    };
  }

  return {
    latestVersion,
    manifest: {
      version: latestVersion,
      url: resolvedUrl.toString(),
      size: best.size,
      sha256: best.sha256,
    },
  };
};

export const fetchUpdateFeed = async (
  feedUrl: URL,
): Promise<{ latestVersion: string; manifest: UpdateFeedManifest | null }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPDATE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(feedUrl, {
      method: "GET",
      headers: buildFeedHeaders(feedUrl),
      signal: controller.signal,
    });
    if (!response.ok) {
      if (response.status === 403 && feedUrl.hostname === "api.github.com") {
        const fallback = await fetchGithubReleaseFallback(feedUrl);
        if (fallback) {
          return fallback;
        }
      }
      throw new Error(`UPDATE_FEED_HTTP_${response.status}`);
    }
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > UPDATE_PAYLOAD_MAX_BYTES) {
      throw new Error("UPDATE_FEED_PAYLOAD_TOO_LARGE");
    }

    const contentType = response.headers.get("content-type") ?? "";
    const shouldParseJson =
      contentType.includes("json") || raw.trim().startsWith("{") || raw.trim().startsWith("[");

    if (shouldParseJson) {
      const parsed = JSON.parse(raw) as unknown;
      const latestVersion = extractVersionFromFeedPayload(parsed);
      if (!latestVersion) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
      return {
        latestVersion,
        manifest: extractManifestFromFeedPayload(parsed, feedUrl),
      };
    }

    const latestVersion = extractVersionFromTextPayload(raw);
    if (!latestVersion) throw new Error("UPDATE_FEED_VERSION_NOT_FOUND");
    return {
      latestVersion,
      manifest: null,
    };
  } finally {
    clearTimeout(timer);
  }
};
