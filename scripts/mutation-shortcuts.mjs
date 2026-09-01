#!/usr/bin/env node
/**
 * 단축키 수정에 대한 변이 테스트(mutation testing).
 *
 * 각 변이는 6차 감사에서 고친 동작 하나를 의도적으로 되돌린다. 대응 테스트가
 * 실패하면 '검출(killed)', 그대로 통과하면 '생존(survived)'이다. 생존은 그 동작을
 * 지키는 테스트가 없다는 뜻이므로 커버리지 공백을 가리킨다.
 *
 * 사용: node scripts/mutation-shortcuts.mjs
 * 주의: 임시 파일로 원본을 백업하고 항상 복원한다. 중단되면 *.mutation-backup을 확인.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, copyFileSync, existsSync, rmSync } from "node:fs";

const ACCEL = "src/shared/utils/shortcutAccelerator.ts";
const HOOK = "src/renderer/src/features/workspace/hooks/useShortcuts.ts";
const TAB = "src/renderer/src/features/settings/components/tabs/ShortcutsTab.tsx";

const SUITES = [
  "tests/dom/shortcutModifierSafety.test.tsx",
  "tests/dom/shortcutHotPathCost.test.tsx",
  "tests/dom/shortcutRecordingValidation.test.tsx",
  "tests/renderer/shortcutAcceleratorContract.test.ts",
];

/** @type {Array<{id:string,file:string,desc:string,find:string,replace:string}>} */
const MUTANTS = [
  {
    id: "M1",
    file: ACCEL,
    desc: "`+` → plus 정규화 제거 (canonical 등가성 소실)",
    find: '  if (key === "+") return "plus";\n',
    replace: "",
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
      // eslint-disable-next-line no-control-regex
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
