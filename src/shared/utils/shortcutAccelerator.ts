/**
 * 단축키 accelerator의 단일 해석 지점.
 *
 * WHY 공유 모듈인가: 기본값은 main(`settingsDefaults.ts`)이 만들고, 기록은 renderer의
 * 설정 화면이 하고, 매칭은 renderer의 전역 keydown이 한다. 세 곳이 각자 문자열을
 * 해석하면 같은 물리 키 조합이 서로 다른 문자열로 공존한다. 실제로 기본값은 `Cmd+,`,
 * 기록 결과는 `cmd+comma`였고 충돌 감지가 이를 다른 단축키로 오인했다.
 */

/** 표기 흔들림(cmd/command/meta)을 하나로 모은다. */
const MODIFIER_ALIASES: Readonly<Record<string, "cmd" | "ctrl" | "shift" | "alt">> = {
  cmd: "cmd",
  command: "cmd",
  meta: "cmd",
  ctrl: "ctrl",
  control: "ctrl",
  shift: "shift",
  alt: "alt",
  option: "alt",
};

/**
 * 수정자 없이 눌러도 본문 입력과 구분되는 키.
 *
 * WHY 이 목록이 필요한가: 수정자 없는 바인딩을 일괄 금지하면 F11(전체화면)이나
 * Escape처럼 무수정자가 정당한 단축키가 함께 죽는다. 반대로 전부 허용하면
 * 인쇄 가능한 문자가 집필 입력을 가로챈다.
 */
const PRINTABLE_TOKEN_KEYS: ReadonlySet<string> = new Set(["comma", "space", "plus"]);

export interface ParsedAccelerator {
  /** canonical 키 토큰. 리터럴 구두점과 이름 표기가 같은 값으로 모인다. */
  key: string;
  cmd: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

export type AcceleratorRejection =
  | "unparsable"
  | "printable-without-primary-modifier";

/**
 * 물리 키를 canonical 토큰으로 모은다.
 *
 * WHY: `KeyboardEvent.key`는 콤마를 `","`로 주는데 설정 화면은 `"comma"`로 저장한다.
 * 양쪽을 같은 토큰으로 접어야 문자열 비교로 충돌을 감지할 수 있다.
 */
export const normalizeShortcutKey = (key: string): string => {
  if (key === ",") return "comma";
  if (key === " ") return "space";
  if (key === "+") return "plus";
  return key.toLowerCase();
};

/**
 * accelerator를 수정자 집합과 키로 분해한다. 해석 불가면 `null`.
 *
 * WARNING: `split("+")`을 쓰면 안 된다. `cmd++`(Cmd와 `+`)가 `["cmd","",""]`로 쪼개진 뒤
 * 빈 조각이 걸러지면서 키가 사라져 단축키가 조용히 죽는다. 그래서 앞에서 수정자만
 * 걷어내고 남은 문자열을 키로 그대로 둔다.
 */
export const parseAccelerator = (accelerator: string): ParsedAccelerator | null => {
  let rest = accelerator.trim().toLowerCase();
  if (!rest) return null;

  const modifiers = { cmd: false, ctrl: false, shift: false, alt: false };

  for (;;) {
    const separator = rest.indexOf("+");
    // separator === 0이면 남은 것이 `+` 키 자체라 더 걷어낼 수 없다.
    if (separator <= 0) break;
    const modifier = MODIFIER_ALIASES[rest.slice(0, separator)];
    if (!modifier) break;
    modifiers[modifier] = true;
    rest = rest.slice(separator + 1);
  }

  const key = normalizeShortcutKey(rest);
  if (!key) return null;
  // 남은 것이 수정자 이름뿐이면(`cmd+shift`) 실제 키가 없다.
  if (MODIFIER_ALIASES[key]) return null;

  return { key, ...modifiers };
};

/**
 * 이 키가 단독으로 눌렸을 때 본문 입력과 구분되지 않는가.
 *
 * canonical 토큰에서 이름 있는 키(`f11`, `escape`, `arrowup`)는 모두 두 글자 이상이므로,
 * 한 글자 키와 구두점 토큰만 인쇄 가능한 부류다.
 */
export const isPrintableShortcutKey = (key: string): boolean =>
  key.length === 1 || PRINTABLE_TOKEN_KEYS.has(key);

/**
 * 바인딩으로 허용할 수 있는 accelerator인가.
 *
 * 빈 문자열은 '바인딩 없음'이라 유효하다 — 기본값 다수가 빈 문자열이다.
 */
export const validateAccelerator = (
  accelerator: string,
): { ok: true } | { ok: false; reason: AcceleratorRejection } => {
  if (!accelerator.trim()) return { ok: true };

  const parsed = parseAccelerator(accelerator);
  if (!parsed) return { ok: false, reason: "unparsable" };

  // WHY cmd/ctrl만 보는가: macOS에서 Alt+문자는 `∫` 같은 인쇄 문자를 만들고,
  // Shift+문자는 대문자를 만든다. 둘 다 집필 입력과 구분되지 않는다.
  if (isPrintableShortcutKey(parsed.key) && !parsed.cmd && !parsed.ctrl) {
    return { ok: false, reason: "printable-without-primary-modifier" };
  }

  return { ok: true };
};

/**
 * 같은 물리 조합이면 항상 같은 문자열이 되도록 직렬화한다.
 *
 * WHY 고정 순서인가: `shift+cmd+b`와 `cmd+shift+b`는 같은 조합이다. 순서를 고정해야
 * 설정 화면의 충돌 감지가 문자열 비교로 동작한다.
 */
export const canonicalizeAccelerator = (accelerator: string): string | null => {
  const parsed = parseAccelerator(accelerator);
  if (!parsed) return null;

  const parts: string[] = [];
  if (parsed.cmd) parts.push("cmd");
  if (parsed.ctrl) parts.push("ctrl");
  if (parsed.alt) parts.push("alt");
  if (parsed.shift) parts.push("shift");
  parts.push(parsed.key);
  return parts.join("+");
};

/** keydown 이벤트에서 매칭에 필요한 필드만 추린 모양. */
export interface AcceleratorEventLike {
  key: string;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** 이미 파싱된 accelerator와 이벤트가 같은 조합인지 판정한다. */
export const matchesAccelerator = (
  event: AcceleratorEventLike,
  parsed: ParsedAccelerator,
): boolean =>
  parsed.cmd === event.metaKey &&
  parsed.ctrl === event.ctrlKey &&
  parsed.shift === event.shiftKey &&
  parsed.alt === event.altKey &&
  normalizeShortcutKey(event.key) === parsed.key;

/**
 * 같은 물리 조합을 물고 있는 액션 쌍을 찾는다. 값은 상대 액션 id 하나다.
 *
 * WHY 문자열 비교로 부족한가: `Cmd+,`(main 기본값)와 `cmd+comma`(설정 화면 기록)는
 * 같은 조합이다. 원시 비교로는 충돌이 잡히지 않고, 실제로는 등록 순서가 빠른 한쪽만
 * 발화해 나머지가 조용히 죽는다.
 */
export const findAcceleratorConflicts = (
  shortcuts: Readonly<Record<string, string>>,
): Map<string, string> => {
  const byCanonical = new Map<string, string[]>();

  for (const [actionId, accelerator] of Object.entries(shortcuts)) {
    if (!accelerator) continue;
    const canonical = canonicalizeAccelerator(accelerator);
    if (!canonical) continue;
    const bucket = byCanonical.get(canonical);
    if (bucket) bucket.push(actionId);
    else byCanonical.set(canonical, [actionId]);
  }

  const conflicts = new Map<string, string>();
  for (const actionIds of byCanonical.values()) {
    if (actionIds.length < 2) continue;
    for (const actionId of actionIds) {
      const other = actionIds.find((candidate) => candidate !== actionId);
      if (other) conflicts.set(actionId, other);
    }
  }
  return conflicts;
};
