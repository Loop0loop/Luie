import { create } from "zustand";
import type { Project } from "../../../shared/types";
import { createCRUDSlice } from "./createCRUDStore";
import type { CRUDStore } from "./createCRUDStore";
import type { ProjectCreateInput, ProjectUpdateInput } from "../../../shared/types";
import { api } from "../services/api";

type BaseProjectStore = CRUDStore<
  Project,
  ProjectCreateInput,
  ProjectUpdateInput
>;

// ProjectStore는 추가 기능 없이 기본 CRUD만 사용하지만 인터페이스는 유지
interface ProjectStore extends BaseProjectStore {
  // 별칭 메서드들 (기존 코드 호환성 유지)
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (
    title: string,
    description?: string,
    projectPath?: string,
  ) => Promise<Project | null>;
  updateProject: (
    id: string,
    title?: string,
    description?: string,
    projectPath?: string,
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;

  // 호환성 필드
  projects: Project[];
  currentProject: Project | null;
}

export const useProjectStore = create<ProjectStore>((set, _get, store) => {
  const setWithAlias: typeof set = (partial) =>
    set((state) => {
      const next = typeof partial === "function" ? partial(state) : partial;
      const nextItems =
        (next as Partial<ProjectStore>).items ?? state.items;
      const nextCurrent =
        (next as Partial<ProjectStore>).currentItem ?? state.currentItem;

      return {
        ...next,
        projects: nextItems,
        currentProject: nextCurrent as Project | null,
      } as Partial<ProjectStore>;
    });

  const crudSlice = createCRUDSlice<
    Project,
    ProjectCreateInput,
    ProjectUpdateInput
  >(api.project, "Project")(setWithAlias, _get, store);

  return {
    ...crudSlice,
    loadProjects: () => crudSlice.loadAll(),
    loadProject: (id: string) => crudSlice.loadOne(id),
    createProject: (
      title: string,
      description?: string,
      projectPath?: string,
    ) => crudSlice.create({ title, description, projectPath }),
    updateProject: (
      id: string,
      title?: string,
      description?: string,
      projectPath?: string,
    ) => crudSlice.update({ id, title, description, projectPath }),
    deleteProject: (id: string) => crudSlice.delete(id),
    setCurrentProject: (project: Project | null) =>
      crudSlice.setCurrent(project),

    // 호환성 필드
    projects: crudSlice.items,
    currentProject: crudSlice.currentItem,
  };
});
