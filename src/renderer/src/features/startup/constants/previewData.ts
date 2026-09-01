import type { CSSProperties } from "react";
import type { ChapterListItem, Project } from "@shared/types";

// NOTE: macOS hiddenInset 타이틀바는 앱이 drag region을 그려줘야 창을 끌 수 있다.
// 헤더 밴드가 그 역할을 하고, 트래픽 라이트(16,16)에 가리지 않도록 좌측 여백을 둔다.
export const dragRegionStyle = {
  WebkitAppRegion: "drag",
} as CSSProperties;

export const SAMPLE_TITLE = "1장. 첫눈";

export const SAMPLE_CONTENT = [
  "<p>겨울바다가 얼어붙은 항구 위로 첫눈이 내리고 있었다. 세연은 등불 아래에서 낡은 지도를 펼쳤다. 지도가 말해 주지 않는 바다가 그녀를 기다리고 있었다.</p>",
  "<p>「오늘 밤에 떠나겠습니다.」 그 말은 생각보다 훨씬 조용하게 나왔다. 조용한 것은 오래 묵어 온 결심들의 특징이었다.</p>",
  "<p>그녀는 마지막으로 등불을 끄려다 멈췄고, 대신 불빛을 조금 더 높이 올렸다. 가라앉지 않는 것들을 지키는 방법이 그것뿐이었다.</p>",
  "<p>지도 위의 빈 바다를 손끝으로 더듬어 보았다. 아무것도 없는 자리가 오히려 뜨거웠다. 그녀는 그 열을 잊지 않으려고 손톱으로 작게 표시를 남겼다.</p>",
].join("");

export const PREVIEW_PROJECT_ID = "wizard-preview-project";
export const PREVIEW_ACTIVE_CHAPTER_ID = "wizard-preview-chapter-1";
export const PREVIEW_TIMESTAMP = "2026-09-01T00:00:00.000Z";

export const PREVIEW_PROJECT: Project = {
  id: PREVIEW_PROJECT_ID,
  title: "녹는 항구",
  createdAt: PREVIEW_TIMESTAMP,
  updatedAt: PREVIEW_TIMESTAMP,
};

export const PREVIEW_CHAPTER_ROWS = [
  ["wizard-preview-chapter-1", "1장. 첫눈", "겨울바다가 얼어붙은 항구 위로 첫눈이 내리고 있었다."],
  ["wizard-preview-chapter-2", "2장. 귀갓길", null],
  ["wizard-preview-chapter-3", "3장. 불빛 아래", null],
] as const;

export const PREVIEW_CHAPTERS: ChapterListItem[] = PREVIEW_CHAPTER_ROWS.map(
  ([id, title, synopsis], index) => ({
    id,
    projectId: PREVIEW_PROJECT_ID,
    title,
    synopsis,
    order: index + 1,
    createdAt: PREVIEW_TIMESTAMP,
    updatedAt: PREVIEW_TIMESTAMP,
  }),
);
