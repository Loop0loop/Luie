/**
 * Placeholder mock data for the entity visualization UI.
 *
 * TODO(RAG): replace `MOCK_VISUAL_BUNDLE` with relations derived from the RAG
 * pipeline. The shape (`EntityVisualBundle`) is the integration contract —
 * downstream components depend on it, not on the mock values.
 *
 * All copy here is intentionally Korean string literals because the *real*
 * source will be user/AI-generated content, not translated UI chrome.
 */

import type { EntityKind, EntityVisualBundle } from "./types";

export const MOCK_VISUAL_BUNDLE: Record<EntityKind, EntityVisualBundle> = {
  character: {
    identityLine: "청룡문의 일대제자이자, 왕성 함락 사건의 핵심 가담자",
    related: [
      { kind: "faction", name: "청룡문", role: "소속 · 일대제자" },
      { kind: "faction", name: "흑야회", role: "적대" },
      { kind: "character", name: "백호단주", role: "스승" },
      { kind: "character", name: "이서연", role: "동문" },
      { kind: "event", name: "왕성 함락", role: "주요 가담" },
      { kind: "event", name: "북해 원정", role: "목격자" },
    ],
  },
  event: {
    identityLine: "왕성을 무너뜨린 결정적 사건, 청룡문·흑야회 충돌의 정점",
    related: [
      { kind: "character", name: "주인공", role: "핵심 가담" },
      { kind: "character", name: "흑야회주", role: "주모자" },
      { kind: "faction", name: "청룡문", role: "관여" },
      { kind: "faction", name: "왕실", role: "피해자" },
      { kind: "event", name: "북해 원정", role: "후속" },
      { kind: "event", name: "삼월 회담", role: "발단" },
    ],
  },
  faction: {
    identityLine: "정파 무림의 중심축, 왕실과 동맹 관계인 천하제일 검문",
    related: [
      { kind: "character", name: "문주 이정", role: "수장" },
      { kind: "character", name: "주인공", role: "일대제자" },
      { kind: "faction", name: "왕실", role: "동맹" },
      { kind: "faction", name: "흑야회", role: "적대" },
      { kind: "event", name: "왕성 함락", role: "참전" },
      { kind: "event", name: "북해 원정", role: "주도" },
    ],
  },
};
