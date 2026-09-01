#!/usr/bin/env node
/**
 * 6차 감사 수정에 대한 변이 테스트(mutation testing).
 *
 * 각 변이는 6차에서 고친 동작 하나를 의도적으로 되돌린다. 대응 테스트가 실패하면
 * '검출(killed)', 그대로 통과하면 '생존(survived)'이다. 생존은 그 동작을 지키는 테스트가
 * 없다는 뜻이므로 커버리지 공백을 가리킨다.
 *
 * 다루는 범위: N16~N19(단축키), N20(smartLink 조회), N21(viewMode 영속화).
 *
 * 사용: node scripts/mutation-audit-fixes.mjs
 * 주의: 임시 파일로 원본을 백업하고 항상 복원한다. 중단되면 *.mutation-backup을 확인.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from "node:fs";

const ACCEL = "src/shared/utils/shortcutAccelerator.ts";
const HOOK = "src/renderer/src/features/workspace/hooks/useShortcuts.ts";
const TAB = "src/renderer/src/features/settings/components/tabs/ShortcutsTab.tsx";
const DEFAULTS = "src/main/manager/settings/settingsDefaults.ts";
const VIEWMODE = "src/renderer/src/features/research/components/wiki/wikiViewPreferences.ts";
const ENTITY_VIEW = "src/renderer/src/features/research/components/wiki/EntityDetailView.tsx";
const SMARTLINK = "src/renderer/src/features/editor/services/smartLinkService.ts";

const SUITES = [
  "tests/dom/shortcutModifierSafety.test.tsx",
  "tests/dom/shortcutHotPathCost.test.tsx",
  "tests/dom/shortcutRecordingValidation.test.tsx",
  "tests/renderer/shortcutAcceleratorContract.test.ts",
  "tests/main/manager/settingsShortcutDefaults.test.ts",
  "tests/dom/wikiViewModePreference.test.tsx",
  "tests/renderer/smartLinkEntityLookup.test.ts",
];

/** @type {Array<{id:string,file:string,desc:string,find:string,replace:string}>} */
const MUTANTS = [
  {
    id: "M1",
    file: ACCEL,
    desc: "`+`/`=` → plus 정규화 제거 (canonical 등가성 소실)",
    find: '  if (key === "+" || key === "=") return "plus";\n',
    replace: "",
  },
  {
    id: "M1b",
    file: ACCEL,
    desc: "`=`만 plus 정규화에서 제외 (저장값/표시 불일치 복원)",
    find: '  if (key === "+" || key === "=") return "plus";',
    replace: '  if (key === "+") return "plus";',
  },
  {
    id: "M2",
    file: ACCEL,
    desc: "`,` → comma 정규화 제거 (리터럴/토큰 등가성 소실)",
    find: '  if (key === ",") return "comma";\n',
    replace: "",
  },
  {
    id: "M3",
    file: ACCEL,
    desc: "무수정자 인쇄문자 거부 규칙 제거 (결함 D1 복원)",
    find: "  if (isPrintableShortcutKey(parsed.key) && !parsed.cmd && !parsed.ctrl) {\n    return { ok: false, reason: \"printable-without-primary-modifier\" };\n  }\n",
    replace: "",
  },
  {
    id: "M4",
    file: ACCEL,
    desc: "isPrintableShortcutKey 항상 true (기능키까지 거부)",
    find: "  key.length === 1 || PRINTABLE_TOKEN_KEYS.has(key);",
    replace: "  true || key.length === 1 || PRINTABLE_TOKEN_KEYS.has(key);",
  },
  {
    id: "M5",
    file: ACCEL,
    desc: "isPrintableShortcutKey 항상 false (인쇄문자 통과)",
    find: "  key.length === 1 || PRINTABLE_TOKEN_KEYS.has(key);",
    replace: "  false && (key.length === 1 || PRINTABLE_TOKEN_KEYS.has(key));",
  },
  {
    id: "M6",
    file: ACCEL,
    desc: "canonical 수정자 순서 고정 해제 (shift를 먼저)",
    find: '  if (parsed.cmd) parts.push("cmd");\n  if (parsed.ctrl) parts.push("ctrl");\n  if (parsed.alt) parts.push("alt");\n  if (parsed.shift) parts.push("shift");',
    replace: '  if (parsed.shift) parts.push("shift");\n  if (parsed.cmd) parts.push("cmd");\n  if (parsed.ctrl) parts.push("ctrl");\n  if (parsed.alt) parts.push("alt");',
  },
  {
    id: "M7",
    file: ACCEL,
    desc: "meta 수정자 별칭 제거 (수정자가 키로 강등되는 경로 복원)",
    find: '  meta: "cmd",\n',
    replace: "",
  },
  {
    id: "M8",
    file: ACCEL,
    desc: "matchesAccelerator에서 shift 비교 무력화",
    find: "  parsed.shift === event.shiftKey &&",
    replace: "  true &&",
  },
  {
    id: "M9",
    file: ACCEL,
    desc: "수정자만 남은 accelerator 거부 제거",
    find: "  if (MODIFIER_ALIASES[key]) return null;\n",
    replace: "",
  },
  {
    id: "M10",
    file: HOOK,
    desc: "useShortcuts의 저장값 검증 제거 (이미 깨진 설정 자기치유 상실)",
    find: "      if (!validateAccelerator(accelerator).ok) continue;\n",
    replace: "",
  },
  {
    id: "M11",
    file: HOOK,
    desc: "effect 의존성에 handlers 복원 (리스너 재등록 회귀)",
    find: "  }, [bindings, enabled]);",
    replace: "  }, [bindings, enabled, handlers]);",
  },
  {
    id: "M12",
    file: HOOK,
    desc: "isEditableTarget을 루프 안으로 복원 (이벤트당 DOM 읽기 N회)",
    find: "        if (editable && !ALLOW_IN_EDITORS.has(action)) continue;",
    replace: "        if (isEditableTarget(event) && !ALLOW_IN_EDITORS.has(action)) continue;",
  },
  {
    id: "M13",
    file: HOOK,
    desc: "accelerator를 keydown마다 재파싱 (핫패스 회귀)",
    find: "  }, [shortcuts]);",
    replace: "  }, [shortcuts, Math.random()]);",
  },
  {
    id: "M14",
    file: TAB,
    desc: "기록 단계 검증 제거 (무효 바인딩 저장 허용)",
    find: "      const validation = validateAccelerator(accelerator);\n      if (!validation.ok) {\n        setRejectedReason(validation.reason);\n        return;\n      }\n",
    replace: "",
  },
  {
    id: "M15",
    file: ACCEL,
    desc: "충돌 감지를 원시 문자열 비교로 되돌림",
    find: "    const canonical = canonicalizeAccelerator(accelerator);\n    if (!canonical) continue;",
    replace: "    const canonical = accelerator;",
  },
  {
    id: "M16",
    file: DEFAULTS,
    desc: "기본값 수정자를 대문자로 되돌림 (표기 혼재 복원)",
    find: 'const mod = platform === "darwin" ? "cmd" : "ctrl";',
    replace: 'const mod = platform === "darwin" ? "Cmd" : "Ctrl";',
  },
  {
    id: "M17",
    file: DEFAULTS,
    desc: "설정 열기 기본값을 리터럴 콤마로 되돌림",
    find: '"app.openSettings": `${mod}+comma`,',
    replace: '"app.openSettings": `${mod}+,`,',
  },
  {
    id: "M18",
    file: DEFAULTS,
    desc: "전체화면 기본값을 무수정자 인쇄문자로 교체 (안전성 위반 주입)",
    find: '"window.toggleFullscreen": "f11",',
    replace: '"window.toggleFullscreen": "g",',
  },
  {
    id: "M19",
    file: TAB,
    desc: "기능키 대문자 표시 제거 (canonical 소문자 노출)",
    find: "      if (FUNCTION_KEY_PATTERN.test(part)) return part.toUpperCase();\n",
    replace: "",
  },
  {
    id: "M20",
    file: TAB,
    desc: "comma 토큰 표시 제거 (저장 표기가 그대로 노출)",
    find: '    case "comma":\n      return ",";\n',
    replace: "",
  },
  {
    id: "M21",
    file: VIEWMODE,
    desc: "viewMode 읽기의 try/catch 제거 (렌더 중 throw 복원 — N21 핵심)",
    find: "  try {\n    return localStorage.getItem(key);\n  } catch {\n    return null;\n  }",
    replace: "  return localStorage.getItem(key);",
  },
  {
    id: "M22",
    file: VIEWMODE,
    desc: "viewMode 쓰기의 try/catch 제거",
    find: "  try {\n    localStorage.setItem(buildKey(prefix, id, KEY_VERSION), mode);\n  } catch {",
    replace: "  localStorage.setItem(buildKey(prefix, id, KEY_VERSION), mode);\n  if (false) {",
  },
  {
    id: "M23",
    file: VIEWMODE,
    desc: "legacy 키 폴백 제거 (기존 사용자 선택 유실)",
    find: "  if (!id) return DEFAULT_VIEW_MODE;\n  return toViewMode(readRaw(buildKey(prefix, id, null))) ?? DEFAULT_VIEW_MODE;",
    replace: "  return DEFAULT_VIEW_MODE;",
  },
  {
    id: "M24",
    file: ENTITY_VIEW,
    desc: "EntityDetailView가 localStorage를 직접 호출하도록 되돌림 (배선 회귀)",
    find: "  const [viewMode, setViewMode] = useState<WikiViewMode>(() =>\n    readWikiViewMode(storagePrefix, entityId),\n  );",
    replace:
      '  const [viewMode, setViewMode] = useState<WikiViewMode>(() =>\n    localStorage.getItem(`${storagePrefix}:${entityId ?? ""}`) === "document" ? "document" : "wiki",\n  );',
  },
  {
    id: "M24b",
    file: VIEWMODE,
    desc: "Infobox 기본값을 닫힘으로 뒤집음",
    find: '  readRaw(buildKey(prefix, id, KEY_VERSION)) !== "closed";',
    replace: '  readRaw(buildKey(prefix, id, KEY_VERSION)) === "open";',
  },
  {
    id: "M24c",
    file: VIEWMODE,
    desc: "Infobox 저장값 무시 (항상 열림 — B5 결함 복원)",
    find: '  readRaw(buildKey(prefix, id, KEY_VERSION)) !== "closed";',
    replace: "  true;",
  },
  {
    id: "M25",
    file: SMARTLINK,
    desc: "매치별 배열 선형 탐색 복원 (N20 핫패스 회귀)",
    find: "        const entity = this.entityByText.get(matchedText);",
    replace: "        const entity = this.entities.find((item) => item.text === matchedText);",
  },
  {
    id: "M26",
    file: SMARTLINK,
    desc: "Map의 first-wins 규칙 제거 (이름 중복 시 우선순위 역전)",
    find: "      if (!this.entityByText.has(entity.text)) {\n        this.entityByText.set(entity.text, entity);\n      }",
    replace: "      this.entityByText.set(entity.text, entity);",
  },
  /**
   * 제외된 변이: `invalidate`에서 `this.entityByText = new Map()` 제거.
   *
   * 등가 변이(equivalent mutant)로 확정해 제외했다. `entityByText`는 `findSmartLinks`
   * 한 곳에서만 읽히고 그 메서드는 `ensureCache()`를 먼저 호출한다. `invalidate`가
   * `pattern = null`로 만들므로 `ensureCache`의 early-return이 성립하지 않아 항상
   * 재빌드되고, 그 과정에서 Map이 재할당된다. 따라서 그 줄을 지워도 관측 가능한
   * 동작 변화가 없다 — 테스트가 못 잡는 게 아니라 잡을 것이 없다.
   */
];

const backupPath = (file) => `${file}.mutation-backup`;
const FILES = [...new Set(MUTANTS.map((m) => m.file))];

const restoreAll = () => {
  for (const file of FILES) {
    const backup = backupPath(file);
    if (existsSync(backup)) {
      copyFileSync(backup, file);
      rmSync(backup);
    }
  }
};

const runSuites = () => {
  try {
    execFileSync("npx", ["vitest", "run", ...SUITES], {
      env: { ...process.env, SKIP_DB_TEST_SETUP: "1" },
      stdio: "pipe",
      encoding: "utf8",
    });
    return { failed: false };
  } catch (error) {
    // NOTE: vitest 출력에 ANSI 색상 코드가 섞여 있어 숫자만 뽑으려면 먼저 제거해야 한다.
    const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.replace(
      /\u001B\[[0-9;]*m/g,
      "",
    );
    const match = output.match(/Tests\s+(\d+) failed/);
    return { failed: true, failedCount: match ? Number(match[1]) : null };
  }
};

process.on("exit", restoreAll);
process.on("SIGINT", () => {
  restoreAll();
  process.exit(130);
});

for (const file of FILES) copyFileSync(file, backupPath(file));

console.log("=== 기준선(변이 없음) 확인 ===");
const baseline = runSuites();
if (baseline.failed) {
  console.error("기준선이 이미 실패한다. 변이 테스트를 신뢰할 수 없다.");
  process.exit(1);
}
console.log("기준선 통과.\n");

const results = [];

for (const mutant of MUTANTS) {
  const original = readFileSync(backupPath(mutant.file), "utf8");

  if (!original.includes(mutant.find)) {
    // 변이가 적용되지 않으면 '생존'이 거짓 양성이 된다. 명시적으로 실패 처리한다.
    results.push({ ...mutant, status: "INVALID" });
    console.log(`${mutant.id}  INVALID   대상 코드를 찾지 못함 — ${mutant.desc}`);
    continue;
  }

  writeFileSync(mutant.file, original.replace(mutant.find, mutant.replace));
  const result = runSuites();
  copyFileSync(backupPath(mutant.file), mutant.file);

  const status = result.failed ? "KILLED" : "SURVIVED";
  results.push({ ...mutant, status, failedCount: result.failedCount });
  const detail = result.failed ? `실패 ${result.failedCount}건` : "테스트가 잡지 못함";
  console.log(`${mutant.id}  ${status.padEnd(9)} ${detail.padEnd(14)} ${mutant.desc}`);
}

restoreAll();

const killed = results.filter((r) => r.status === "KILLED").length;
const invalid = results.filter((r) => r.status === "INVALID").length;
const survived = results.filter((r) => r.status === "SURVIVED");
const score = ((killed / results.length) * 100).toFixed(1);

console.log(`\n=== 변이 점수 ===`);
console.log(`검출 ${killed} / 전체 ${results.length}  =  ${score}%`);
if (invalid > 0) console.log(`무효 변이 ${invalid}건 (스크립트 수정 필요)`);
if (survived.length > 0) {
  console.log(`\n생존 변이 (커버리지 공백):`);
  for (const s of survived) console.log(`  ${s.id} ${s.desc}`);
}

process.exitCode = survived.length === 0 && invalid === 0 ? 0 : 1;
