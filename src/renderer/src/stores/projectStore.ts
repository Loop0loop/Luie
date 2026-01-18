import { create } from "zustand";
import type { Project } from "@prisma/client";

interface ProjectStore {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;

  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<void>;
  createProject: (title: string, description?: string) => Promise<void>;
  updateProject: (
    id: string,
    title?: string,
    description?: string,
  ) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  loadProjects: async () => {
    set({ isLoading: true });
    try {
      const response = await window.api.project.getAll();
      if (response.success && response.data) {
        set({ projects: response.data });
      }
    } catch (error) {
      console.error("Failed to load projects:", error);
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
      }
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (title: string, description?: string) => {
    try {
      const response = await window.api.project.create({ title, description });
      if (response.success && response.data) {
        set((state) => ({
          projects: [response.data, ...state.projects],
        }));
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  },

  updateProject: async (id: string, title?: string, description?: string) => {
    try {
      const response = await window.api.project.update({
        id,
        title,
        description,
      });
      if (response.success && response.data) {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? response.data : p,
          ),
          currentProject:
            state.currentProject?.id === id
              ? response.data
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
