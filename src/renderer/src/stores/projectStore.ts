import { create } from "zustand";
import { Project } from "@prisma/client";
import { createCRUDSlice, CRUDStore } from "./createCRUDStore";
import { ProjectCreateInput, ProjectUpdateInput } from "../../../shared/types";

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

export const useProjectStore = create<ProjectStore>((set, get) => {
  const crudSlice = createCRUDSlice<
    Project,
    ProjectCreateInput,
    ProjectUpdateInput
  >(window.api.project, "Project")(set, get, {
    getState: get,
    setState: set,
    subscribe: () => () => {},
  } as any);

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
