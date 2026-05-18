/**
 * node.ts — 노드 컴포넌트 공통 스타일 상수.
 *
 * EntityNode, MemoNode, TimelineNode에서 공유합니다.
 * 한 곳에서 관리해 복사-붙여넣기 기반 확장을 방지합니다.
 */

/**
 * React-Flow Handle 공통 className.
 * hover 시에만 나타나는 작은 원형 점 (Obsidian Canvas 스타일).
 * group-hover:opacity-60 은 EntityNode처럼 group wrapper가 있는 경우에만 효과 있음.
 */
export const CANVAS_HANDLE_CLASS =
  "h-2.5! w-2.5! rounded-full! border-2! border-panel! bg-accent! opacity-0 transition-opacity duration-150 hover:opacity-100 group-hover:opacity-60";

/**
 * 노드 카드 기본 shadow 클래스.
 * Tailwind arbitrary value는 상수화해 한 곳에서 관리합니다.
 */
export const CANVAS_NODE_SHADOW_CLASS =
  "shadow-[0_2px_8px_rgba(0,0,0,0.15)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.25)]";

/**
 * 노드 카드 선택 상태 shadow.
 */
export const CANVAS_NODE_SELECTED_SHADOW_CLASS =
  "shadow-[0_0_0_2px_var(--accent-bg),0_4px_12px_rgba(0,0,0,0.3)]";

/**
 * hex 알파값 상수 — 동적 색상에 투명도를 붙일 때 사용합니다.
 * 예: `${colour}${HEX_ALPHA_20}` → 20% 투명도
 */
export const HEX_ALPHA_20 = "33" as const; // 0x33 / 0xFF ≈ 20%
export const HEX_ALPHA_25 = "40" as const; // 0x40 / 0xFF ≈ 25%
