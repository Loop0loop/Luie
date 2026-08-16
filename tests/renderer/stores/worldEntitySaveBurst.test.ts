// TEST_LEVEL: STORE_INTEGRATION
// PROVES: 같은 entity에 대한 patch 100개가 마지막 값을 보존한다.

import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCharacterStore } from "../../../src/renderer/src/features/research/stores/characterStore.js";
import { useProjectStore } from "../../../src/renderer/src/features/project/stores/projectStore.js";
import { flushWorldEntityMutations } from "../../../src/renderer/src/shared/store/worldEntityMutationQueue.js";
import type { Character, Project } from "../../../src/shared/types/index.js";

const mockedApi = vi.hoisted(() => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
  character: {
    getAll: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("@shared/api", () => ({ api: mockedApi }));
vi.mock("@renderer/features/research/utils/worldGraphRefresh", () => ({
  refreshWorldGraph: vi.fn(),
}));

describe("world entity save burst", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCharacterStore.setState(useCharacterStore.getInitialState(), true);
    useProjectStore.setState(useProjectStore.getInitialState(), true);
  });

  it("persists the final value from one hundred queued character patches", async () => {
    const character: Character = {
      id: "character-1",
      projectId: "project-1",
      name: "Hero",
      description: "revision-0",
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
    };
    const project: Project = {
      id: "project-1",
      title: "Novel",
      createdAt: new Date("2026-07-19T00:00:00.000Z"),
      updatedAt: new Date("2026-07-19T00:00:00.000Z"),
    };
    let persistedDescription = character.description ?? "";
    mockedApi.character.update.mockImplementation(async (input) => {
      persistedDescription = input.description ?? persistedDescription;
      return {
        success: true,
        data: { ...character, description: persistedDescription },
      };
    });
    useProjectStore.setState({ currentItem: project, currentProject: project });
    useCharacterStore.setState({
      items: [character],
      characters: [character],
      currentItem: character,
      currentCharacter: character,
    });

    const saves = Array.from({ length: 100 }, (_, index) =>
      useCharacterStore.getState().updateCharacter({
        id: character.id,
        description: `revision-${index + 1}`,
      }),
    );
    await flushWorldEntityMutations();
    await Promise.all(saves);

    expect(persistedDescription).toBe("revision-100");
    expect(useCharacterStore.getState().currentItem?.description).toBe(
      "revision-100",
    );
  });
});
