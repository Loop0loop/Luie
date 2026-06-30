/**
 * llmfitConstants — llmfit 런타임 설치 관련 상수와 플랫폼 매핑.
 *
 * llmfit 바이너리는 동봉하지 않고 GitHub releases 최신본에서 런타임 다운로드한다.
 * 버전은 `/repos/{repo}/releases/latest` 로 동적 해석한다(하드코딩 금지).
 */

export const LLMFIT_GITHUB_REPO = "AlexsJones/llmfit" as const;
export const LLMFIT_LATEST_RELEASE_API =
  `https://api.github.com/repos/${LLMFIT_GITHUB_REPO}/releases/latest` as const;

/** Node 플랫폼/아키텍처 → llmfit 자산 target triple 매핑. */
export type LlmfitPlatformKey =
  | "darwin-arm64"
  | "darwin-x64"
  | "win32-x64"
  | "win32-arm64"
  | "linux-x64"
  | "linux-arm64";

/**
 * 각 플랫폼의 자산 파일명에 포함된 Rust target triple 과 확장자.
 * 자산명 형식: `llmfit-v{version}-{triple}.{ext}` (+ 동반 `.sha256`).
 */
export const LLMFIT_ASSET_TARGETS: Record<
  LlmfitPlatformKey,
  { triple: string; ext: "tar.gz" | "zip" }
> = {
  "darwin-arm64": { triple: "aarch64-apple-darwin", ext: "tar.gz" },
  "darwin-x64": { triple: "x86_64-apple-darwin", ext: "tar.gz" },
  "win32-x64": { triple: "x86_64-pc-windows-msvc", ext: "zip" },
  "win32-arm64": { triple: "aarch64-pc-windows-msvc", ext: "zip" },
  "linux-x64": { triple: "x86_64-unknown-linux-gnu", ext: "tar.gz" },
  "linux-arm64": { triple: "aarch64-unknown-linux-gnu", ext: "tar.gz" },
};

/** 현재 프로세스의 플랫폼 키를 해석한다(미지원이면 null). */
export function resolveLlmfitPlatformKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): LlmfitPlatformKey | null {
  const key = `${platform}-${arch}`;
  if (key in LLMFIT_ASSET_TARGETS) {
    return key as LlmfitPlatformKey;
  }
  return null;
}

/** 설치된 바이너리 파일명(플랫폼별). */
export function llmfitBinaryName(platform: NodeJS.Platform = process.platform): string {
  return platform === "win32" ? "llmfit.exe" : "llmfit";
}
