/**
 * llmfitInstaller 순수 헬퍼 단위 테스트.
 *
 * 네트워크/파일시스템에 의존하지 않는 자산 선택·sha 파싱·플랫폼 매핑만 검증한다.
 * (다운로드/추출은 통합 검증에서 다룬다.)
 */
import { describe, expect, it } from "vitest";
import {
  selectLlmfitAsset,
  parseSha256Content,
  parseDigestField,
  type GithubReleaseAsset,
} from "../../../src/main/services/llm/llmfitInstaller.js";
import {
  resolveLlmfitPlatformKey,
  llmfitBinaryName,
  LLMFIT_ASSET_TARGETS,
} from "../../../src/main/services/llm/llmfitConstants.js";

// v0.9.29 실제 릴리스 자산 구조를 본뜬 픽스처.
const VERSION = "v0.9.29";
function makeAssets(): GithubReleaseAsset[] {
  const triples = [
    "aarch64-apple-darwin.tar.gz",
    "aarch64-pc-windows-msvc.zip",
    "aarch64-unknown-linux-gnu.tar.gz",
    "aarch64-unknown-linux-musl.tar.gz",
    "x86_64-apple-darwin.tar.gz",
    "x86_64-pc-windows-msvc.zip",
    "x86_64-unknown-linux-gnu.tar.gz",
    "x86_64-unknown-linux-musl.tar.gz",
  ];
  const assets: GithubReleaseAsset[] = [];
  for (const t of triples) {
    const name = `llmfit-${VERSION}-${t}`;
    assets.push({
      name,
      browser_download_url: `https://example.com/${name}`,
      digest: "sha256:" + "a".repeat(64),
    });
    assets.push({
      name: `${name}.sha256`,
      browser_download_url: `https://example.com/${name}.sha256`,
      digest: null,
    });
  }
  return assets;
}

describe("llmfitConstants", () => {
  it("maps known platforms to target triples", () => {
    expect(LLMFIT_ASSET_TARGETS["darwin-arm64"]).toEqual({
      triple: "aarch64-apple-darwin",
      ext: "tar.gz",
    });
    expect(LLMFIT_ASSET_TARGETS["win32-x64"]).toEqual({
      triple: "x86_64-pc-windows-msvc",
      ext: "zip",
    });
  });

  it("resolves platform key for supported combos and null for unknown", () => {
    expect(resolveLlmfitPlatformKey("darwin", "arm64")).toBe("darwin-arm64");
    expect(resolveLlmfitPlatformKey("linux", "x64")).toBe("linux-x64");
    expect(resolveLlmfitPlatformKey("win32", "x64")).toBe("win32-x64");
    expect(resolveLlmfitPlatformKey("freebsd", "x64")).toBeNull();
    expect(resolveLlmfitPlatformKey("darwin", "ia32")).toBeNull();
  });

  it("returns platform-correct binary name", () => {
    expect(llmfitBinaryName("darwin")).toBe("llmfit");
    expect(llmfitBinaryName("linux")).toBe("llmfit");
    expect(llmfitBinaryName("win32")).toBe("llmfit.exe");
  });
});

describe("selectLlmfitAsset", () => {
  it("selects the macOS arm64 tar.gz archive and its sha256 sibling", () => {
    const assets = makeAssets();
    const result = selectLlmfitAsset(assets, "darwin-arm64");
    expect(result).not.toBeNull();
    expect(result!.archive.name).toBe(
      `llmfit-${VERSION}-aarch64-apple-darwin.tar.gz`,
    );
    expect(result!.sha256Asset?.name).toBe(
      `llmfit-${VERSION}-aarch64-apple-darwin.tar.gz.sha256`,
    );
  });

  it("selects the windows x64 zip archive", () => {
    const result = selectLlmfitAsset(makeAssets(), "win32-x64");
    expect(result!.archive.name).toBe(
      `llmfit-${VERSION}-x86_64-pc-windows-msvc.zip`,
    );
    expect(result!.archive.name.endsWith(".zip")).toBe(true);
  });

  it("does not pick the .sha256 file as the archive", () => {
    const result = selectLlmfitAsset(makeAssets(), "linux-x64");
    expect(result!.archive.name.endsWith(".sha256")).toBe(false);
    expect(result!.archive.name).toBe(
      `llmfit-${VERSION}-x86_64-unknown-linux-gnu.tar.gz`,
    );
  });

  it("returns null when no matching asset exists", () => {
    const assets: GithubReleaseAsset[] = [
      {
        name: "llmfit-v0.9.29-x86_64-apple-darwin.tar.gz",
        browser_download_url: "x",
        digest: null,
      },
    ];
    // request arm64 mac → no aarch64-apple-darwin asset present
    expect(selectLlmfitAsset(assets, "darwin-arm64")).toBeNull();
  });

  it("works when sha256 sibling is absent", () => {
    const assets: GithubReleaseAsset[] = [
      {
        name: "llmfit-v0.9.29-x86_64-unknown-linux-gnu.tar.gz",
        browser_download_url: "x",
        digest: "sha256:" + "b".repeat(64),
      },
    ];
    const result = selectLlmfitAsset(assets, "linux-x64");
    expect(result!.archive).toBeDefined();
    expect(result!.sha256Asset).toBeNull();
  });
});

describe("parseSha256Content", () => {
  it("parses '<hex>  <filename>' format", () => {
    const hex =
      "6d39681b26c61279ac1f82db35a04a05009e94c415b51c858ff571489a82fc06";
    expect(parseSha256Content(`${hex}  llmfit.tar.gz`)).toBe(hex);
  });

  it("parses bare hex", () => {
    const hex = "c".repeat(64);
    expect(parseSha256Content(`  ${hex}\n`)).toBe(hex);
  });

  it("lowercases uppercase hex", () => {
    const hex = "A".repeat(64);
    expect(parseSha256Content(hex)).toBe("a".repeat(64));
  });

  it("returns null when no 64-hex token present", () => {
    expect(parseSha256Content("not a hash")).toBeNull();
    expect(parseSha256Content("abc123")).toBeNull();
  });
});

describe("parseDigestField", () => {
  it("parses sha256:<hex> digest", () => {
    const hex = "d".repeat(64);
    expect(parseDigestField(`sha256:${hex}`)).toBe(hex);
  });

  it("returns null for null/empty/non-sha256", () => {
    expect(parseDigestField(null)).toBeNull();
    expect(parseDigestField(undefined)).toBeNull();
    expect(parseDigestField("")).toBeNull();
    expect(parseDigestField("md5:abc")).toBeNull();
    expect(parseDigestField("sha256:tooshort")).toBeNull();
  });
});
