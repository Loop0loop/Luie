import { useEffect, useMemo, useRef } from "react";
import type { ShortcutAction, ShortcutMap } from "@shared/types";
import {
  matchesAccelerator,
  parseAccelerator,
  validateAccelerator,
  type ParsedAccelerator,
} from "@shared/utils/shortcutAccelerator";
import { useShortcutStore } from "@renderer/features/workspace/stores/shortcutStore";

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

const isEditableTarget = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
  return Boolean(target.isContentEditable);
};

const ALLOW_IN_EDITORS = new Set<ShortcutAction>([
  "app.openSettings",
  "app.closeWindow",
  "app.quit",
  "chapter.new",
  "chapter.save",
  "chapter.delete",
  "chapter.open.1",
  "chapter.open.2",
  "chapter.open.3",
  "chapter.open.4",
  "chapter.open.5",
  "chapter.open.6",
  "chapter.open.7",
  "chapter.open.8",
  "chapter.open.9",
  "chapter.open.0",
  "export.openPreview",
  "export.openWindow",
  "research.open.character",
  "research.open.world",
  "research.open.scrap",
  "research.open.analysis",
  "research.open.character.left",
  "research.open.world.left",
  "research.open.scrap.left",
  "research.open.analysis.left",
  "character.openTemplate",
  "world.tab.synopsis",
  "world.tab.terms",
  "world.tab.mindmap",
  "world.tab.drawing",
  "world.tab.plot",
  "world.tab.graph",
  "world.addTerm",
  "scrap.addMemo",
  "project.rename",
  "editor.openRight",
  "editor.openLeft",
  "split.swapSides",
  "editor.fontSize.increase",
  "editor.fontSize.decrease",
  "window.toggleFullscreen",
]);

// WARNING: 저장 shortcut이 손상돼도 plain key로 앱이 종료되지 않도록 파괴적 동작에는 Cmd/Ctrl이 필요하다.
const REQUIRE_PRIMARY_MODIFIER = new Set<ShortcutAction>([
  "app.closeWindow",
  "app.quit",
]);

export function useShortcuts(handlers: ShortcutHandlers, enabled: boolean = true): void {
  const shortcuts = useShortcutStore((state) => state.shortcuts) as ShortcutMap;

  /**
   * WHY 미리 파싱하는가: 이 리스너는 집필 중 모든 키 입력을 통과한다. accelerator는
   * `shortcuts`가 바뀔 때만 변하는 정적 값인데, keydown마다 재파싱하면 키 입력 1회
   * 비용이 등록된 단축키 수에 비례한다.
   *
   * WHY 무효 바인딩을 여기서 걸러내는가: 이미 저장된 값도 방어해야 한다. 설정 화면에서
   * 수정자 없이 콤마만 기록하면 `comma`가 영속화되고, `app.openSettings`는 편집 중
   * 허용 액션이라 집필 중 콤마 입력마다 설정이 열렸다. 기록 단계 검증만으로는
   * 이미 깨진 설정 파일을 되돌릴 수 없다.
   */
  const bindings = useMemo(() => {
    const parsed: Array<[ShortcutAction, ParsedAccelerator]> = [];
    for (const [action, accelerator] of Object.entries(shortcuts)) {
      if (!accelerator) continue;
      if (!validateAccelerator(accelerator).ok) continue;
      const binding = parseAccelerator(accelerator);
      if (!binding) continue;
      parsed.push([action as ShortcutAction, binding]);
    }
    return parsed;
  }, [shortcuts]);

  /**
   * WHY ref인가: `handlers`는 호출부(`useEditorRootShortcuts`)의 useMemo가 만드는
   * 약 60개 핸들러 맵이고 그 의존성에 `isSidebarOpen`·`fontSize`가 있다. effect
   * 의존성에 두면 사이드바를 토글할 때마다 전역 keydown 리스너가 해제·재등록된다.
   */
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      // WHY 루프 밖인가: 편집 영역 여부는 이벤트당 한 번 정해진다. 루프 안에서 읽으면
      // DOM 프로퍼티 접근이 액션 수만큼 반복된다.
      const editable = isEditableTarget(event);
      const currentHandlers = handlersRef.current;

      for (const [action, binding] of bindings) {
        const handler = currentHandlers[action];
        if (!handler) continue;
        if (editable && !ALLOW_IN_EDITORS.has(action)) continue;
        if (REQUIRE_PRIMARY_MODIFIER.has(action) && !event.metaKey && !event.ctrlKey) {
          continue;
        }
        if (matchesAccelerator(event, binding)) {
          event.preventDefault();
          handler();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [bindings, enabled]);
}
