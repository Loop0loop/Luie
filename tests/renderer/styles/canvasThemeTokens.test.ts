import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(__dirname, "../../..");
const tokensPath = join(
  projectRoot,
  "src/renderer/src/styles/global.tokens.css",
);
const canvasCssPath = join(
  projectRoot,
  "src/renderer/src/styles/components/canvas.css",
);
const canvasFeatureRoot = join(
  projectRoot,
  "src/renderer/src/features/canvas",
);

const tokensCss = readFileSync(tokensPath, "utf8");
const canvasCss = readFileSync(canvasCssPath, "utf8");

/** 주석을 제거해 설명 안의 예시 값이 검사에 걸리지 않게 한다. */
const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

/**
 * selector별 custom property 선언을 모은다. `:root`와 `[data-theme=...]`는 같은
 * html 엘리먼트를 가리키므로, 어떤 token이 어느 theme에서 정의됐는지는 selector
 * 텍스트로만 구분할 수 있다.
 */
const collectDeclarationsBySelector = (css: string): Map<string, Set<string>> => {
  const result = new Map<string, Set<string>>();
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = blockPattern.exec(css)) !== null) {
    const selector = match[1].trim().replace(/\s+/g, " ");
    const body = match[2];
    const declared = new Set(
      [...body.matchAll(/(--[\w-]+)\s*:/g)].map((entry) => entry[1]),
    );
    if (declared.size === 0) continue;

    const bucket = result.get(selector);
    if (bucket) {
      declared.forEach((token) => bucket.add(token));
      continue;
    }
    result.set(selector, declared);
  }

  return result;
};

const declarationsBySelector = collectDeclarationsBySelector(
  stripComments(tokensCss),
);

const declaredIn = (selector: string): Set<string> =>
  declarationsBySelector.get(selector) ?? new Set<string>();

/** `:root`나 `@theme`에 한 번이라도 선언된 token. 기본값 존재 여부를 판정한다. */
const baseTokens = new Set<string>([
  ...declaredIn(":root"),
  ...declaredIn("@theme"),
]);

const collectSourceFiles = (dir: string): string[] => {
  const entries = readdirSync(dir);
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) return collectSourceFiles(fullPath);
    return /\.tsx?$/.test(entry) ? [fullPath] : [];
  });
};

const referencedTokens = (css: string): string[] => [
  ...new Set([...stripComments(css).matchAll(/var\((--[\w-]+)/g)].map((m) => m[1])),
];

describe("canvas theme tokens", () => {
  it("canvas.css가 참조하는 모든 token이 기본값을 가진다", () => {
    const missing = referencedTokens(canvasCss).filter(
      (token) => !baseTokens.has(token),
    );
    expect(missing).toEqual([]);
  });

  it("canvas feature 코드가 참조하는 모든 token이 기본값을 가진다", () => {
    // NOTE: 과거 useFocusSync가 정의되지 않은 `var(--accent)`를 써서 focus한 관계선이
    // 검정으로 그려졌다. 같은 실수를 정적으로 잡는다.
    const missing = collectSourceFiles(canvasFeatureRoot).flatMap((file) =>
      referencedTokens(readFileSync(file, "utf8"))
        .filter((token) => !baseTokens.has(token))
        .map((token) => `${token} (${file.replace(`${projectRoot}/`, "")})`),
    );
    expect(missing).toEqual([]);
  });

  it("canvas.css에 색상 literal이 남아 있지 않다", () => {
    const literals = [
      ...stripComments(canvasCss).matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g),
    ].map((match) => match[0]);
    expect(literals).toEqual([]);
  });

  it("theme마다 달라야 하는 canvas token은 dark에서 재정의된다", () => {
    const darkTokens = declaredIn('[data-theme="dark"]');
    const mustDiffer = [
      "--canvas-inset-highlight",
      "--canvas-shadow-rest",
      "--canvas-shadow-hover",
      "--canvas-shadow-active",
      "--canvas-kind-chip-fg",
      "--canvas-node-character",
      "--canvas-node-event",
      "--canvas-node-faction",
      "--canvas-node-term",
      "--canvas-node-chapter",
      "--canvas-node-world-entity",
    ];

    expect(
      mustDiffer.filter((token) => !baseTokens.has(token)),
    ).toEqual([]);
    expect(mustDiffer.filter((token) => !darkTokens.has(token))).toEqual([]);
  });

  it("상호작용 상태 배경 token이 theme마다 정의된다", () => {
    // NOTE: dark에 `--bg-surface-hover`가 없어 light의 rgba(0,0,0,0.04)를 상속하면
    // hover가 표면보다 어두워진다. 앱 전체에 영향이 있으므로 theme 단위로 검사한다.
    const stateTokens = [
      "--bg-surface-hover",
      "--bg-element-hover",
      "--bg-active",
    ];
    const themeSelectors = [
      ":root",
      '[data-theme="dark"]',
      '[data-theme="sepia"]',
    ];

    const missing = themeSelectors.flatMap((selector) => {
      const declared = declaredIn(selector);
      return stateTokens
        .filter((token) => !declared.has(token))
        .map((token) => `${selector} ${token}`);
    });

    expect(missing).toEqual([]);
  });

  it("canvas 표면 token은 하드코딩 대신 theme 표면 token에서 파생한다", () => {
    const rootBlock = stripComments(tokensCss).match(
      /:root\s*\{[^{}]*--canvas-bg[^{}]*\}/,
    );
    expect(rootBlock).not.toBeNull();
    expect(rootBlock?.[0]).toContain("--canvas-bg: var(--bg-app)");
    expect(rootBlock?.[0]).toContain("var(--bg-panel)");
  });
});
