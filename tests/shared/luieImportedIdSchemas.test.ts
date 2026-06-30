import { describe, expect, it } from "vitest";
import {
  characterUpdateSchema,
  chapterUpdateSchema,
  projectDeleteArgSchema,
  worldReplicaDocumentSetSchema,
} from "../../src/shared/schemas/index";

describe("luie imported id schemas", () => {
  it("accepts non-UUID ids preserved from .luie packages", () => {
    const projectId = "legacy-project";
    const characterId = "character-main";
    const chapterId = "chapter-01";

    expect(
      projectDeleteArgSchema.safeParse({ id: projectId, deleteFile: false }).success,
    ).toBe(true);
    expect(
      worldReplicaDocumentSetSchema.safeParse({
        projectId,
        docType: "graph",
        payload: { nodes: [], edges: [] },
      }).success,
    ).toBe(true);
    expect(
      characterUpdateSchema.safeParse({ id: characterId, name: "A" }).success,
    ).toBe(true);
    expect(
      chapterUpdateSchema.safeParse({ id: chapterId, content: "text" }).success,
    ).toBe(true);
  });

  it("still rejects empty ids at IPC boundaries", () => {
    expect(projectDeleteArgSchema.safeParse({ id: "" }).success).toBe(false);
    expect(characterUpdateSchema.safeParse({ id: "", name: "A" }).success).toBe(
      false,
    );
  });
});
