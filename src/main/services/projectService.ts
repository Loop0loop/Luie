/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from '../database/index.js'
import { createLogger } from '../../shared/logger/index.js'
import { ErrorCode } from '../../shared/constants/index.js'
import type { ProjectCreateInput, ProjectUpdateInput } from '../../shared/types/index.js'

const logger = createLogger('ProjectService')

export class ProjectService {
  async createProject(input: ProjectCreateInput) {
    try {
      logger.info('Creating project', input)
      
      const project = await db.getClient().project.create({
        data: {
          title: input.title,
          description: input.description,
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: 30,
            },
          },
        },
        include: {
          settings: true,
        },
      })

      logger.info('Project created successfully', { projectId: project.id })
      return project
    } catch (error) {
      logger.error('Failed to create project', error)
      throw new Error(ErrorCode.PROJECT_CREATE_FAILED)
    }
  }

  async getProject(id: string) {
    try {
      const project = await db.getClient().project.findUnique({
        where: { id },
        include: {
          settings: true,
          chapters: {
            orderBy: { order: 'asc' },
          },
          characters: true,
          terms: true,
        },
      })

      if (!project) {
        throw new Error(ErrorCode.PROJECT_NOT_FOUND)
      }

      return project
    } catch (error) {
      logger.error('Failed to get project', error)
      throw error
    }
  }

  async getAllProjects() {
    try {
      const projects = await db.getClient().project.findMany({
        include: {
          settings: true,
          _count: {
            select: {
              chapters: true,
              characters: true,
              terms: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      return projects
    } catch (error) {
      logger.error('Failed to get all projects', error)
      throw error
    }
  }

  async updateProject(input: ProjectUpdateInput) {
    try {
      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
        },
      })

      logger.info('Project updated successfully', { projectId: project.id })
      return project
    } catch (error) {
      logger.error('Failed to update project', error)
      throw new Error(ErrorCode.PROJECT_UPDATE_FAILED)
    }
  }

  async deleteProject(id: string) {
    try {
      await db.getClient().project.delete({
        where: { id },
      })

      logger.info('Project deleted successfully', { projectId: id })
      return { success: true }
    } catch (error) {
      logger.error('Failed to delete project', error)
      throw new Error(ErrorCode.PROJECT_DELETE_FAILED)
    }
  }
}

export const projectService = new ProjectService()
