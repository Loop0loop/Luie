import {
  LUIE_PACKAGE_EXTENSION,
  SNAPSHOT_FILE_KEEP_COUNT,
} from "../../../../shared/constants/index.js";
import { mergeWorldGraphLayout } from "../../../../shared/world/worldGraphDocument.js";
import { writeLuieContainer } from "../../io/luieContainer.js";
import { ensureSafeAbsolutePath } from "../../../utils/pathValidation.js";
import { settingsManager } from "../../../manager/settingsManager.js";
import { normalizeLuiePackagePath } from "./projectPathPolicy.js";
import { getProjectAttachmentPath } from "./projectAttachmentStore.js";
import {
  buildExportChapterData,
  buildExportCharacterData,
  buildExportSnapshotData,
  buildExportTermData,
  buildProjectPackageMeta,
  resolveProjectPackageUpdatedAt,
  buildWorldDrawing,
  buildWorldGraph,
  buildWorldMindmap,
  buildWorldPlot,
  buildWorldScrapMemos,
  buildWorldSynopsis,
} from "./projectExportPayload.js";
import {
  createEmptyParsedWorldPayload,
  getProjectForExport,
  readWorldPayloadFromPackage,
  readWorldPayloadFromReplica,
  type LoggerLike,
  type ParsedWorldPayload,
} from "./exportEngine/index.js";

const resolveExportPath = (
  projectId: string,
  projectPath: string | null | undefined,
  logger: LoggerLike,
): string | null => {
  if (!projectPath) {
    logger.info("Skipping package export (missing projectPath)", { projectId });
    return null;
  }
  if (!projectPath.toLowerCase().endsWith(LUIE_PACKAGE_EXTENSION)) {
    logger.info("Skipping package export (not .luie)", {
      projectId,
      projectPath,
    });
    return null;
  }
  try {
    return ensureSafeAbsolutePath(projectPath, "projectPath");
  } catch (error) {
    logger.warn("Skipping package export (invalid projectPath)", {
      projectId,
      projectPath,
      error,
    });
    return null;
  }
};

export const exportProjectPackageWithOptions = async (input: {
  projectId: string;
  logger: LoggerLike;
  options?: {
    targetPath?: string;
    worldSourcePath?: string | null;
  };
}): Promise<boolean> => {
  const project = await getProjectForExport(input.projectId);
  if (!project) return false;
  const attachedProjectPath = await getProjectAttachmentPath(input.projectId);

  const exportPath = input.options?.targetPath
    ? normalizeLuiePackagePath(input.options.targetPath, "targetPath")
    : resolveExportPath(input.projectId, attachedProjectPath, input.logger);
  if (!exportPath) return false;

  const worldSourcePath =
    input.options?.worldSourcePath === undefined
      ? exportPath
      : input.options.worldSourcePath;

  const { exportChapters, chapterMeta } = buildExportChapterData(project.chapters);
  const characters = buildExportCharacterData(project.characters);
  const terms = buildExportTermData(project.terms);
  const snapshotExportLimit =
    settingsManager.getAll().snapshotExportLimit ?? SNAPSHOT_FILE_KEEP_COUNT;
  const snapshots = buildExportSnapshotData(project.snapshots, snapshotExportLimit);
  const replicaWorld = await readWorldPayloadFromReplica(input.projectId, input.logger);
  const missingPackageDocTypes = ([
    "synopsis",
    "plot",
    "drawing",
    "mindmap",
    "memos",
    "graph",
  ] as Array<keyof ParsedWorldPayload>).filter(
    (docType) => !replicaWorld[docType].found,
  );
  const parsedWorld =
    worldSourcePath === null || missingPackageDocTypes.length === 0
      ? createEmptyParsedWorldPayload()
      : await readWorldPayloadFromPackage(
          worldSourcePath,
          input.logger,
          missingPackageDocTypes,
        );

  const synopsis = buildWorldSynopsis(
    project,
    replicaWorld.synopsis.found ? replicaWorld.synopsis.parsed : parsedWorld.synopsis,
  );
  const plot = buildWorldPlot(
    replicaWorld.plot.found ? replicaWorld.plot.parsed : parsedWorld.plot,
  );
  const drawing = buildWorldDrawing(
    replicaWorld.drawing.found ? replicaWorld.drawing.parsed : parsedWorld.drawing,
  );
  const mindmap = buildWorldMindmap(
    replicaWorld.mindmap.found ? replicaWorld.mindmap.parsed : parsedWorld.mindmap,
  );
  const memos = buildWorldScrapMemos(
    replicaWorld.memos.found ? replicaWorld.memos.parsed : parsedWorld.memos,
  );
  const graphLayout =
    replicaWorld.graph.found ? replicaWorld.graph.parsed : parsedWorld.graph;
  const graph = graphLayout.success
    ? mergeWorldGraphLayout(buildWorldGraph(project), graphLayout.data)
    : buildWorldGraph(project);
  const metaUpdatedAt = resolveProjectPackageUpdatedAt(project, {
    synopsis,
    plot,
    drawing,
    mindmap,
    memos,
    graphUpdatedAt: graphLayout.success ? graphLayout.data.updatedAt : undefined,
  });
  const meta = buildProjectPackageMeta(project, chapterMeta, metaUpdatedAt);

  input.logger.info("Exporting .luie package", {
    projectId: input.projectId,
    projectPath: exportPath,
    chapterCount: exportChapters.length,
    characterCount: characters.length,
    termCount: terms.length,
    worldNodeCount: graph.nodes.length,
    relationCount: graph.edges.length,
    snapshotCount: snapshots.length,
  });

  await writeLuieContainer({
    targetPath: exportPath,
    payload: {
      meta,
      chapters: exportChapters,
      characters,
      terms,
      synopsis,
      plot,
      drawing,
      mindmap,
      memos,
      graph,
      snapshots,
    },
    logger: input.logger,
  });
  return true;
};
