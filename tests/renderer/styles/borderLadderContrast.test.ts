import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * border 3단 계단과 `data-contrast="high"` 경로를 정적으로 검사한다.
 *
 * 값을 이 파일에 하드코딩하지 않는다. `global.tokens.css`를 파싱해 **실효값**을
 * 해석한다 — alias(`var(--x)`)를 따라가고, CSS 특이도와 선언 순서로 승자를 고른다.
 * 그래야 "토큰은 정의했는데 특이도 때문에 안 걸린다" 같은 부류를 잡을 수 있다.
 *
 * 과거 두 번 겪은 회귀가 검사 대상이다.
 *  1) 표면 계단이 붕괴해 인접 표면이 같은 색이 됐다(§1 진단).
 *  2) `[data-contrast="high"]`가 특이도 1이라 `[data-theme][data-temp]`(2)에 져서
 *     색온도 변형 4개 조합에서 고대비가 **아예 걸리지 않았다**(§1에서 알고도 롤백).
 */

const projectRoot = resolve(__dirname, "../../..");
const tokensCss = readFileSync(
  join(projectRoot, "src/renderer/src/styles/global.tokens.css"),
  "utf8",
);

/** 임계값은 한곳에 모아 둔다. 의도적으로 바꿀 때는 여기만 고친다. */
const THRESHOLD = {
  /** WCAG 1.4.11 UI 경계. 반올림 금지이므로 3.0 이상을 그대로 쓴다. */
  uiBoundary: 3,
  /** 장식선이 grid prison이 되지 않는 상한(§2 확정). */
  decorativeMax: 1.6,
  /** 고대비 모드의 3차 텍스트는 AA 완전 준수가 목표다(기본 모드는 4.0으로 정렬). */
  highContrastTertiary: 4.5,
} as const;

type Attrs = { theme: string; temp: string; contrast: string };

type Block = { selector: string; body: string; index: number };

const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

const parseBlocks = (css: string): Block[] => {
  const blocks: Block[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = pattern.exec(css)) !== null) {
    blocks.push({
      selector: match[1].trim().replace(/\s+/g, " "),
      body: match[2],
      index: index++,
    });
  }
  return blocks;
};

const blocks = parseBlocks(stripComments(tokensCss));

/**
 * 선택자가 주어진 속성 조합에 매치되는지 판정하고, 매치되면 특이도를 돌려준다.
 * `data-accent` 등 이 테스트가 다루지 않는 축을 요구하는 블록은 제외한다.
 */
const matchSpecificity = (selector: string, attrs: Attrs): number | null => {
  if (selector.includes("@") || selector.includes(",")) return null;
  if (!selector.startsWith(":root") && !selector.startsWith("[")) return null;

  const required: Record<string, string> = {};
  for (const m of selector.matchAll(/\[data-([\w-]+)="?([^"\]]*)"?\]/g)) {
    required[m[1]] = m[2];
  }
  const unsupported = Object.keys(required).filter(
    (key) => !["theme", "temp", "contrast"].includes(key),
  );
  if (unsupported.length > 0) return null;

  for (const [key, value] of Object.entries(required)) {
    if (attrs[key as keyof Attrs] !== value) return null;
  }

  // 특이도: attribute selector 개수 + `:root` 의사 클래스
  return (
    Object.keys(required).length + (selector.startsWith(":root") ? 1 : 0)
  );
};

/** 특이도 → 선언 순서로 승자를 고른다. CSS cascade와 같은 규칙이다. */
const winningBlock = (attrs: Attrs, token: string): Block | null => {
  let winner: Block | null = null;
  let bestSpec = -1;
  let bestIndex = -1;

  for (const block of blocks) {
    const spec = matchSpecificity(block.selector, attrs);
    if (spec === null) continue;
    if (!new RegExp(`--${token}\\s*:\\s*([^;]+);`).test(block.body)) continue;
    if (spec > bestSpec || (spec === bestSpec && block.index > bestIndex)) {
      winner = block;
      bestSpec = spec;
      bestIndex = block.index;
    }
  }
  return winner;
};

const rawValue = (attrs: Attrs, token: string): string | null => {
  const block = winningBlock(attrs, token);
  if (block === null) return null;
  const found = block.body.match(new RegExp(`--${token}\\s*:\\s*([^;]+);`));
  return found ? found[1].trim() : null;
};

/** 어떤 블록이 이겼는지 알려준다. base 폴백 검사에 쓴다. */
const winningSelector = (attrs: Attrs, token: string): string | null =>
  winningBlock(attrs, token)?.selector ?? null;

/** alias(`var(--x)`)를 끝까지 따라가 색 리터럴을 얻는다. */
const resolveColor = (attrs: Attrs, token: string, depth = 0): string => {
  if (depth > 10) throw new Error(`${token} alias 순환`);
  const value = rawValue(attrs, token);
  if (value === null) throw new Error(`${token} 미정의 (${JSON.stringify(attrs)})`);
  const alias = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (alias) return resolveColor(attrs, alias[1], depth + 1);
  return value;
};

type Rgb = [number, number, number];

const parseColor = (value: string): { rgb: Rgb; alpha: number } => {
  const hex = value.match(/^#([0-9a-fA-F]{6})$/);
  if (hex) {
    const n = hex[1];
    return {
      rgb: [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16)) as Rgb,
      alpha: 1,
    };
  }
  const rgba = value.match(
    /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/,
  );
  if (rgba) {
    return {
      rgb: [Number(rgba[1]), Number(rgba[2]), Number(rgba[3])] as Rgb,
      alpha: rgba[4] === undefined ? 1 : Number(rgba[4]),
    };
  }
  throw new Error(`색 파싱 실패: ${value}`);
};

/** 알파 색을 배경 위에 합성한다. dark의 border는 white alpha라 이 단계가 필요하다. */
const composite = (fg: string, bg: string): Rgb => {
  const f = parseColor(fg);
  const b = parseColor(bg);
  if (f.alpha >= 1) return f.rgb;
  return f.rgb.map((v, i) => v * f.alpha + b.rgb[i] * (1 - f.alpha)) as Rgb;
};

const luminance = (rgb: Rgb): number => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (fg: string, bg: string): number => {
  const [a, b] = [luminance(composite(fg, bg)), luminance(parseColor(bg).rgb)]
    .sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

const THEMES = ["light", "dark", "sepia"] as const;
const TEMPS = ["", "cool", "warm"] as const;

const combos: { name: string; attrs: Attrs }[] = THEMES.flatMap((theme) =>
  TEMPS.map((temp) => ({
    name: temp ? `${theme}+${temp}` : theme,
    // NOTE: light 기본은 `:root`가 담당하므로 theme 속성이 비어 있다.
    attrs: { theme: theme === "light" && !temp ? "" : theme, temp, contrast: "" },
  })),
);

const withHigh = (attrs: Attrs): Attrs => ({ ...attrs, contrast: "high" });

/** control이 실제로 놓이는 면. §4에서 기준면을 element → panel로 옮긴 근거다. */
const CONTROL_SURFACE = "bg-panel";

describe("border 3단 계단", () => {
  it.each(combos)("$name — default < active < strong 단조 증가", ({ attrs }) => {
    const surface = resolveColor(attrs, CONTROL_SURFACE);
    const ladder = ["border-default", "border-active", "border-strong"].map(
      (token) => contrast(resolveColor(attrs, token), surface),
    );
    expect(ladder[0]).toBeLessThan(ladder[1]);
    expect(ladder[1]).toBeLessThan(ladder[2]);
  });

  it.each(combos)(
    "$name — border-strong이 control 표면에서 WCAG 1.4.11의 3:1을 만족한다",
    ({ attrs }) => {
      const ratio = contrast(
        resolveColor(attrs, "border-strong"),
        resolveColor(attrs, CONTROL_SURFACE),
      );
      expect(ratio).toBeGreaterThanOrEqual(THRESHOLD.uiBoundary);
    },
  );

  it.each(combos)(
    "$name — border-default는 장식선이므로 상한을 넘지 않는다",
    ({ attrs }) => {
      // NOTE: 장식선을 3:1로 올리면 화면이 grid prison이 된다(§2 확정). 3:1이 필요한
      // 경계는 `--border-strong`이 담당하므로 이쪽은 상한을 검사한다.
      const ratio = contrast(
        resolveColor(attrs, "border-default"),
        resolveColor(attrs, CONTROL_SURFACE),
      );
      expect(ratio).toBeLessThan(THRESHOLD.decorativeMax);
    },
  );
});

describe('data-contrast="high" 경로', () => {
  it.each(combos)(
    "$name — 고대비가 실제로 적용된다 (특이도 회귀 방어)",
    ({ attrs }) => {
      // NOTE: 이것이 이 파일의 핵심이다. `[data-contrast="high"]`는 특이도 1이고
      // `[data-theme][data-temp]`는 2라서, theme별 분기 블록이 없으면 색온도 변형
      // 4개 조합에서 고대비가 아무 효과도 내지 못한다. 토큰이 "정의돼 있다"만
      // 확인하는 검사로는 절대 잡히지 않는다.
      const watched = ["border-default", "text-tertiary", "text-secondary"];
      const unchanged = watched.filter(
        (token) =>
          resolveColor(attrs, token) === resolveColor(withHigh(attrs), token),
      );
      expect(unchanged).toEqual([]);
    },
  );

  it.each(combos)(
    "$name — 고대비 값이 자기 조합의 블록에서 온다 (base 폴백 금지)",
    ({ attrs }) => {
      // NOTE: 위 검사만으로는 부족하다. 색온도 변형의 고대비 블록을 지워도
      // base `[data-contrast="high"]`가 값을 공급해 "값이 바뀌었다"는 통과한다.
      // 그러면 light+warm이 light 기본의 회색 램프를 물려받아 색조가 어긋난다.
      // 승자 블록의 선택자가 자기 theme·temp를 명시하는지 직접 확인한다.
      if (!attrs.theme && !attrs.temp) return; // light 기본은 base 블록이 정답이다
      // NOTE: dark의 색온도 변형은 `[data-theme="dark"][data-contrast="high"]`(0,2,0)를
      // **의도적으로 공유**한다. dark의 border는 white alpha이고 텍스트도 거의 중성이라
      // 변형마다 값을 나눌 이유가 없다(§2 "축은 역할 전체에서 일정해야 한다"). 그래서
      // temp 명시를 요구하지 않고 theme 명시만 확인한다.
      const requireTemp = attrs.theme !== "dark";
      const high = withHigh(attrs);
      const wrongSource = ["text-primary", "text-secondary", "text-tertiary", "border-default"]
        .filter((token) => {
          const selector = winningSelector(high, token);
          if (selector === null) return true;
          if (!selector.includes('data-contrast="high"')) return true;
          if (attrs.theme && !selector.includes(`data-theme="${attrs.theme}"`)) return true;
          if (requireTemp && attrs.temp && !selector.includes(`data-temp="${attrs.temp}"`)) return true;
          return false;
        });
      expect(wrongSource).toEqual([]);
    },
  );

  it.each(combos)("$name — 고대비 border가 기본보다 진하다", ({ attrs }) => {
    const surface = resolveColor(attrs, CONTROL_SURFACE);
    const normal = contrast(resolveColor(attrs, "border-default"), surface);
    const high = contrast(
      resolveColor(withHigh(attrs), "border-default"),
      surface,
    );
    expect(high).toBeGreaterThan(normal);
  });

  it.each(combos)(
    "$name — 고대비 3차 텍스트가 AA를 완전 준수한다",
    ({ attrs }) => {
      // NOTE: 기본 모드는 3단 위계를 지키려고 4.0:1로 정렬했고(§2), dark는 글레어
      // 때문에 2.55로 더 낮다. 그 격차를 메우는 것이 이 모드의 존재 이유다.
      const high = withHigh(attrs);
      const surfaces = ["bg-panel", "bg-app", "bg-sidebar", "bg-element"].map(
        (token) => resolveColor(high, token),
      );
      const worst = Math.min(
        ...surfaces.map((surface) =>
          contrast(resolveColor(high, "text-tertiary"), surface),
        ),
      );
      expect(worst).toBeGreaterThanOrEqual(THRESHOLD.highContrastTertiary);
    },
  );

  it("고대비가 theme 색조를 버리지 않는다", () => {
    // NOTE: 이전 구현은 순검정 `#000`과 중성 회색 `#333`을 얹어서 sepia의 따뜻한
    // 종이 위에 회색 글자가 그려졌다. 각 theme의 축(`b − r`) 부호가 기본 모드와
    // 같은지로 검사한다. 명도만 내리는 균등 감산이면 축이 보존된다.
    const axis = (value: string): number => {
      const { rgb } = parseColor(value);
      return rgb[2] - rgb[0];
    };
    const flipped = combos
      .filter(({ attrs }) => attrs.theme !== "dark")
      .flatMap(({ name, attrs }) =>
        ["text-primary", "text-secondary", "text-tertiary"]
          .filter((token) => {
            const normal = axis(resolveColor(attrs, token));
            const high = axis(resolveColor(withHigh(attrs), token));
            return Math.sign(normal) !== Math.sign(high);
          })
          .map((token) => `${name} ${token}`),
      );
    expect(flipped).toEqual([]);
  });
});

describe("dark 계열 상속", () => {
  it("dark+cool·dark+warm의 border-default가 dark와 같다", () => {
    // NOTE: dark의 border는 white alpha라 3개 변형이 같은 값을 상속해야 한다.
    // 변형에서 따로 리터럴을 박으면 색온도 전환 시 테두리 강도가 튄다.
    const base = resolveColor({ theme: "dark", temp: "", contrast: "" }, "border-default");
    for (const temp of ["cool", "warm"]) {
      expect(
        resolveColor({ theme: "dark", temp, contrast: "" }, "border-default"),
      ).toBe(base);
    }
  });
});
