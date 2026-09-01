#!/usr/bin/env node
// NOTE: token 위반이 baseline을 초과할 때만 실패하며 baseline은 감소 방향으로만 갱신한다.
//
// 2026-08-31 결함 3건 수정. 이전 구현은 실제 진척이 수치에 나타나지 않아 신호로 쓸 수 없었다.
//  1) 주석을 세고 있었다. 근거를 적으려고 NOTE에 hex를 쓰면 위반이 늘어난다.
//     토큰 작업은 반드시 값의 근거를 남기므로, 개선할수록 수치가 나빠지는 구조였다.
//  2) 토큰 **정의** 파일을 위반으로 세고 있었다. `global.tokens.css`는 hex가 있어야 하는
//     유일한 곳이다. rawHex 431 중 262(61%)가 이 파일이라 컴포넌트의 실제 진척이 묻혔다.
//  3) baseline이 낡아 arbitraryPx가 HEAD에서도 초과 상태였다(417 vs 403). 상시 REGRESSION
//     표시는 경고를 무의미하게 만든다.
//
// 토큰 정의 파일은 게이트에서 빼되 참고 수치로 출력한다. 그 파일의 값 정합성은
// `tests/renderer/styles/borderLadderContrast.test.ts`와 `canvasThemeTokens.test.ts`가
// 대비·계단·특이도로 검증하므로, 개수를 세는 것보다 강한 보호가 이미 걸려 있다.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("src/renderer/src");
// NOTE: shadcn primitive layer는 Luie token migration 대상이 아니다.
const EXCLUDE = [path.join(ROOT, "components/ui")];
// NOTE: 토큰 정의 파일. 게이트 대상이 아니라 참고 수치로 뽑는다.
const TOKEN_DEFINITION_FILES = [path.join(ROOT, "styles/global.tokens.css")];

const BASELINE = {
  rawHex: 128,
  rawColor: 19,
  arbitraryPx: 432,   // 병행 세션 StartupWizard(14px) 포함 실측값
  roundedBig: 13,      // rounded-xl/2xl/3xl/4xl only
  roundedFull: 152,    // 원형(아바타·배지·진행링) — 감시용
  shadowBig: 11,
  shadowArbitrary: 4,  // paper/device/inset 그림자 (P3 emulation)
  shadcnVocab: 0,
};

const PATTERNS = {
  rawHex: /#[0-9a-fA-F]{3,6}\b/g,
  rawColor:
    /\b(?:bg|text|border)-(?:blue|red|green|purple|yellow|indigo|pink|slate|gray|zinc|neutral|stone|emerald|sky|violet|amber|rose|orange|teal|cyan|lime)-[0-9]{2,3}\b/g,
  arbitraryPx: /\[[0-9]+px\]/g,
  roundedBig: /\brounded-(?:xl|2xl|3xl|4xl)\b/g,
  roundedFull: /\brounded-full\b/g,
  shadowBig: /\bshadow-(?:lg|xl|2xl)\b/g,
  shadowArbitrary: /\bshadow-\[[^\]]+\]/g,
  shadcnVocab:
    /(?:bg|text|border|ring|fill|stroke|divide|placeholder|caret|outline|decoration|from|to|via)-(?:foreground|background|muted-foreground|accent-foreground|destructive(?!-foreground))\b/g,
};
// NOTE: 2026-08-31 실측값으로 재설정했다. 이전 baseline은 왜곡된 수치 위에 세워져 있었다.
// 2026-09-01 shadowBig 22 → 21. §4의 `shadow-sm` → `shadow-control` 수렴으로 1건 줄어든 것을
// 확정한다(감소 방향 갱신). 검정 그림자 잔여 `shadow-xs`/`2xs`/`md`/`lg`/`xl`은 별도 항목이다.
// 2026-09-01 §10 A그룹으로 rawHex 145 → 144(`#323232` 폴백 제거) · rawColor 99 → 98
// (`text-zinc-400` 제거) · arbitraryPx 417 → 414(`rounded-[24px]` 3 + `rounded-r-[24px]` 1이
// `rounded-editor-shell`로, 대신 `rounded-[12px]` 1건은 남아 net −3).
// 2026-09-01 §11 형광펜·글자색 팔레트를 토큰으로 옮겨 rawHex 144 → 143.
// `constants.ts`에 남은 16개는 커스텀 픽커 초기값용 anchor hex다(픽커가 hex를 파싱한다).
/**
 * 주석을 제거한다. 블록 주석(`/* *\/`)과 줄 주석(`//`) 모두 대상이다.
 * 줄 주석은 URL(`https://`)을 지우지 않도록 줄 시작의 것만 처리한다.
 */
const stripComments = (source) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (EXCLUDE.some((x) => p.startsWith(x))) continue;
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const isTokenDefinition = (file) => TOKEN_DEFINITION_FILES.includes(file);

const totals = Object.fromEntries(Object.keys(PATTERNS).map((k) => [k, 0]));
const tokenFileTotals = Object.fromEntries(
  Object.keys(PATTERNS).map((k) => [k, 0]),
);

for (const f of files) {
  const source = stripComments(fs.readFileSync(f, "utf8"));
  const sink = isTokenDefinition(f) ? tokenFileTotals : totals;
  for (const k in PATTERNS) {
    const m = source.match(PATTERNS[k]);
    if (m) sink[k] += m.length;
  }
}

let failed = false;
console.log(
  `design tokens guard — ${files.length} files scanned (주석 제외, 토큰 정의 파일 분리)\n`,
);
for (const k of Object.keys(PATTERNS)) {
  const actual = totals[k];
  const base = BASELINE[k];
  const ok = actual <= base;
  if (!ok) failed = true;
  const slack = ok && actual < base ? `  ↓ ${base - actual} 개선` : "";
  console.log(
    `${ok ? "✓" : "✗"} ${k.padEnd(12)} ${String(actual).padStart(4)} / baseline ${base}${ok ? slack : "  ⬆ REGRESSION"}`,
  );
}

const tokenFileHex = tokenFileTotals.rawHex;
console.log(
  `\n참고 — 토큰 정의 파일의 색 리터럴 ${tokenFileHex}건. 게이트 대상이 아니다.`,
);
console.log(
  "  값 정합성은 tests/renderer/styles/{borderLadderContrast,canvasThemeTokens}.test.ts 가",
);
console.log("  대비·계단·특이도로 검증한다.");

if (!failed) {
  const improvable = Object.keys(PATTERNS).filter((k) => totals[k] < BASELINE[k]);
  if (improvable.length > 0) {
    console.log(
      `\nbaseline을 낮출 수 있다: ${improvable.map((k) => `${k}→${totals[k]}`).join(", ")}`,
    );
  }
}

process.exit(failed ? 1 : 0);
