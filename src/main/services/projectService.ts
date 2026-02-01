/**
 * Project service - 프로젝트 관리 비즈니스 로직
 */

import { db } from '../database/index.js'
import { createLogger } from '../../shared/logger/index.js'
import {
  ErrorCode,
  DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
  LUIE_PACKAGE_EXTENSION,
  LUIE_PACKAGE_FORMAT,
  LUIE_PACKAGE_CONTAINER_DIR,
  LUIE_PACKAGE_VERSION,
  PACKAGE_EXPORT_DEBOUNCE_MS,
  LUIE_MANUSCRIPT_DIR,
  MARKDOWN_EXTENSION,
} from '../../shared/constants/index.js'
import type {
  ProjectCreateInput,
  ProjectUpdateInput,
  ProjectExportRecord,
  ChapterExportRecord,
  CharacterExportRecord,
  TermExportRecord,
  SnapshotExportRecord,
} from '../../shared/types/index.js'
import { writeLuiePackage } from '../handler/system/ipcFsHandlers.js'
import { ServiceError } from '../utils/serviceError.js'

const logger = createLogger('ProjectService')

export class ProjectService {
  private exportTimers = new Map<string, NodeJS.Timeout>()

  async createProject(input: ProjectCreateInput) {
    try {
      logger.info('Creating project', input)
      
      const project = await db.getClient().project.create({
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
          settings: {
            create: {
              autoSave: true,
              autoSaveInterval: DEFAULT_PROJECT_AUTO_SAVE_INTERVAL_SECONDS,
            },
          },
        },
        include: {
          settings: true,
        },
      })

      const projectId = String(project.id)
      logger.info('Project created successfully', { projectId })
      this.schedulePackageExport(projectId, 'project:create')
      return project
    } catch (error) {
      logger.error('Failed to create project', error)
      throw new ServiceError(
        ErrorCode.PROJECT_CREATE_FAILED,
        'Failed to create project',
        { input },
        error,
      )
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
        throw new ServiceError(
          ErrorCode.PROJECT_NOT_FOUND,
          'Project not found',
          { id },
        )
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
      throw new ServiceError(
        ErrorCode.DB_QUERY_FAILED,
        'Failed to get all projects',
        undefined,
        error,
      )
    }
  }

  async updateProject(input: ProjectUpdateInput) {
    try {
      const project = await db.getClient().project.update({
        where: { id: input.id },
        data: {
          title: input.title,
          description: input.description,
          projectPath: input.projectPath,
        },
      })

      const projectId = String(project.id)
      logger.info('Project updated successfully', { projectId })
      this.schedulePackageExport(projectId, 'project:update')
      return project
    } catch (error) {
      logger.error('Failed to update project', error)
      throw new ServiceError(
        ErrorCode.PROJECT_UPDATE_FAILED,
        'Failed to update project',
        { input },
        error,
      )
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
      throw new ServiceError(
        ErrorCode.PROJECT_DELETE_FAILED,
        'Failed to delete project',
        { id },
        error,
      )
    }
  }

  schedulePackageExport(projectId: string, reason?: string) {
    const existing = this.exportTimers.get(projectId)
    if (existing) {
      clearTimeout(existing)
    }

    const timer = setTimeout(async () => {
      this.exportTimers.delete(projectId)
      try {
        await this.exportProjectPackage(projectId)
      } catch (error) {
        logger.error('Failed to export project package', { projectId, reason, error })
      }
    }, PACKAGE_EXPORT_DEBOUNCE_MS)

    this.exportTimers.set(projectId, timer)
  }

  async exportProjectPackage(projectId: string) {
    const project = (await db.getClient().project.findUnique({
      where: { id: projectId },
      include: {
        chapters: { orderBy: { order: 'asc' } },
        characters: true,
        terms: true,
        snapshots: true,
      },
    })) as ProjectExportRecord | null

    if (!project?.projectPath) {
      return
    }

    if (!project.projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
      return
    }

    const chapters = project.chapters.map((chapter: ChapterExportRecord) => ({
      id: chapter.id,
      title: chapter.title,
      order: chapter.order,
      updatedAt: chapter.updatedAt,
      content: chapter.content,
      file: `${LUIE_MANUSCRIPT_DIR}/${chapter.id}${MARKDOWN_EXTENSION}`,
    }))

    const characters = project.characters.map((character: CharacterExportRecord) => {
      let attributes: unknown = undefined
      if (character.attributes) {
        try {
          attributes = JSON.parse(character.attributes)
        } catch {
          attributes = character.attributes
        }
      }
      return {
        id: character.id,
        name: character.name,
        description: character.description,
        firstAppearance: character.firstAppearance,
        attributes,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
      }
    })

    const terms = project.terms.map((term: TermExportRecord) => ({
      id: term.id,
      term: term.term,
      definition: term.definition,
      category: term.category,
      firstAppearance: term.firstAppearance,
      createdAt: term.createdAt,
      updatedAt: term.updatedAt,
    }))

    const snapshots = project.snapshots.map((snapshot: SnapshotExportRecord) => ({
      id: snapshot.id,
      projectId: snapshot.projectId,
      chapterId: snapshot.chapterId,
      content: snapshot.content,
      description: snapshot.description,
      createdAt: snapshot.createdAt?.toISOString?.() ?? String(snapshot.createdAt),
    }))

    const meta = {
      format: LUIE_PACKAGE_FORMAT,
      container: LUIE_PACKAGE_CONTAINER_DIR,
      version: LUIE_PACKAGE_VERSION,
      projectId: project.id,
      title: project.title,
      description: project.description,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      chapters: chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        order: chapter.order,
        updatedAt: chapter.updatedAt,
        file: chapter.file,
      })),
    }

    await writeLuiePackage(
      project.projectPath,
      {
        meta,
        chapters,
        characters,
        terms,
        snapshots,
      },
      logger,
    )

    logger.info('Project package exported', {
      projectId: project.id,
      path: project.projectPath,
    })
  }
}

export const projectService = new ProjectService()
