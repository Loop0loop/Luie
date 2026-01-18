import { create } from "zustand";
import type { Project } from "@prisma/client";

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;

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
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const response = await window.api.project.getAll();
      if (response.success && response.data) {
        set({ projects: response.data });
      } else {
        set({ projects: [] });
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
      set({ projects: [] });
    } finally {
      set({ isLoading: false });
    }
  },

  loadProject: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await window.api.project.get(id);
      if (response.success && response.data) {
        set({ currentProject: response.data });
      } else {
        set({ currentProject: null });
      }
    } catch (error) {
      console.error("Failed to load project:", error);
      set({ currentProject: null });
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (
    title: string,
    description?: string,
    projectPath?: string,
  ) => {
    try {
      const response = await window.api.project.create({ title, description, projectPath });
      if (response.success && response.data) {
        const newProject: Project = response.data;
        set((state) => ({
          projects: [newProject, ...state.projects],
        }));
        return newProject;
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }

    return null;
  },

  updateProject: async (id: string, title?: string, description?: string, projectPath?: string) => {
    try {
      const response = await window.api.project.update({
        id,
        title,
        description,
        projectPath,
      });
      if (response.success && response.data) {
        const updatedProject: Project = response.data;
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? updatedProject : p,
          ),
          currentProject:
            state.currentProject?.id === id
              ? updatedProject
              : state.currentProject,
        }));
      }
    } catch (error) {
      console.error("Failed to update project:", error);
    }
  },

  deleteProject: async (id: string) => {
    try {
      const response = await window.api.project.delete(id);
      if (response.success) {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject:
            state.currentProject?.id === id ? null : state.currentProject,
        }));
      }
    } catch (error) {
      console.error("Failed to delete project:", error);
    }
  },

  setCurrentProject: (project: Project | null) => {
    set({ currentProject: project });
  },
}));
