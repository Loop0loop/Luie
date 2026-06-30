import type { TFunction } from "i18next";
import type { CanvasEntityPreview } from "../../../types";

export type EntityKind = Exclude<CanvasEntityPreview["kind"], "memo">;
export type CanvasSection = { id: string; label: string };

export const CANVAS_DOCUMENT_MARKDOWN_KEY = "canvasDocumentMarkdown";

const DEFAULT_SECTIONS: Record<EntityKind, CanvasSection[]> = {
  character: [
    { id: "overview", label: "기본 정보" },
    { id: "physical", label: "외적 특징 (Physical Traits)" },
    { id: "personality", label: "성격적 특징 (Personality)" },
    { id: "arc", label: "성장의 여정 (Character Arc)" },
    { id: "speech", label: "대사 / 말투 특징 (Speech Pattern)" },
  ],
  event: [
    { id: "overview", label: "기본 정보" },
    { id: "timeline", label: "진행 흐름 (Timeline)" },
    { id: "participants", label: "참여 인물 (Participants)" },
    { id: "notes", label: "메모 (Notes)" },
  ],
  faction: [
    { id: "overview", label: "기본 정보" },
    { id: "organization", label: "조직 구조 (Organization)" },
    { id: "relations", label: "관계 (Relations)" },
    { id: "notes", label: "메모 (Notes)" },
  ],
};

export function composeMarkdown(sections: CanvasSection[], attrs: Record<string, unknown>): string {
  return sections
    .map((section) => {
      const content = getString(attrs[section.id]).trim();
      return `# ${section.label}\n\n${content || getSectionPrompt(section.id)}`;
    })
    .join("\n\n");
}

export function decomposeMarkdown(markdown: string, oldSections: CanvasSection[]): Record<string, unknown> {
  const parsed: Array<{ label: string; content: string[] }> = [];
  let current: { label: string; content: string[] } | null = null;

  for (const line of markdown.split("\n")) {
    const heading = /^#\s+(.+?)\s*$/.exec(line);
    if (heading) {
      current = { label: heading[1], content: [] };
      parsed.push(current);
    } else if (current) {
      current.content.push(line);
    }
  }

  if (parsed.length === 0) return {};

  const sections = parsed.map((section, index) => ({
    id: oldSections[index]?.id ?? `section_${Date.now()}_${index}`,
    label: section.label,
  }));
  const contentById: Record<string, string> = {};
  parsed.forEach((section, index) => {
    contentById[sections[index].id] = section.content.join("\n").trim();
  });
  return { sections, ...contentById };
}

export function getSections(kind: EntityKind, attrs: Record<string, unknown>): CanvasSection[] {
  const sections = attrs.sections;
  if (!Array.isArray(sections)) return DEFAULT_SECTIONS[kind];

  const parsed = sections
    .map((section) => {
      if (!section || typeof section !== "object") return null;
      const record = section as Record<string, unknown>;
      return typeof record.id === "string" && typeof record.label === "string"
        ? { id: record.id, label: record.label }
        : null;
    })
    .filter((section): section is CanvasSection => section !== null);
  return parsed.length > 0 ? parsed : DEFAULT_SECTIONS[kind];
}

export function getKindLabel(kind: EntityKind, t: TFunction): string {
  if (kind === "character") return t("research.title.characters", "Characters");
  if (kind === "event") return t("research.title.events", "Events");
  return t("research.title.factions", "Factions");
}

export function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

export function getTagValues(attrs: Record<string, unknown>): string[] {
  return [...getStringArray(attrs.tags), ...getStringArray(attrs.keywords)];
}

export function formatDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function getSectionPrompt(sectionId: string): string {
  const prompts: Record<string, string> = {
    overview: "- 집필 중 반드시 유지해야 할 사실\n- 장면에서 드러나는 역할\n- 독자가 기억해야 할 한 줄",
    physical: "- 장면에서 반복해서 보일 외형 단서\n- 복장, 소품, 몸짓",
    personality: "- 선택을 밀어붙이는 성향\n- 약점과 금기\n- 관계에서 드러나는 말투",
    arc: "- 처음 상태\n- 흔들리는 사건\n- 바뀌거나 끝까지 바뀌지 않는 지점",
    speech: "- 자주 쓰는 표현\n- 문장 길이와 리듬\n- 감정이 올라왔을 때의 변화",
    timeline: "- 원인\n- 전개\n- 결과",
    participants: "- 직접 관여한 인물\n- 영향을 받은 세력",
    organization: "- 구조\n- 권한\n- 외부에서 보이는 얼굴",
    relations: "- 우호\n- 적대\n- 거래 또는 약점",
    notes: "- 집필 중 확인할 메모",
  };
  return prompts[sectionId] ?? "- 집필 중 확인할 내용";
}
