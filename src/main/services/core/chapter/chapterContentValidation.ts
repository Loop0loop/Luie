import { IPC_CHANNELS } from "../../../../shared/ipc/channels.js";
import type {
  ChapterSaveProtectedPayload,
  ChapterUpdateInput,
} from "../../../../shared/types/index.js";
import { isTestEnv } from "../../../utils/env/index.js";
import { trackKeywordAppearances } from "../../features/manuscript/chapterKeywords.js";
import {
  chapterLogger,
  fireAndForget,
  SKIP_NONCRITICAL_DERIVED_ON_STRESS,
} from "./chapterRuntime.js";

const loadSnapshotService = async () =>
  (await import("../../../domains/recovery/index.js")).snapshotService;

const broadcastSaveProtected = async (
  payload: ChapterSaveProtectedPayload,
): Promise<void> => {
  try {
    const { BrowserWindow } = await import("electron");
    for (const window of BrowserWindow.getAllWindows()) {
      if (window.isDestroyed()) continue;
      window.webContents.send(IPC_CHANNELS.CHAPTER_SAVE_PROTECTED, payload);
    }
  } catch (error) {
    // NOTE: 알림 전파 실패가 저장 진행을 방해하지 않는다(테스트 electron mock도 여기서 무시된다).
    chapterLogger.warn("Failed to broadcast chapter save protection notice", {
      error,
    });
  }
};

export const applyChapterContentUpdate = async (
  input: ChapterUpdateInput,
  current: { projectId?: unknown; content?: unknown } | null,
  updateData: Record<string, unknown>,
): Promise<void> => {
  if (input.content === undefined) return;

  const oldContent =
    typeof current?.content === "string" ? current.content : "";
  const oldLen = oldContent.length;
  const newLen = input.content.length;
  const projectId =
    typeof current?.projectId === "string" ? current.projectId : undefined;

  const isFullWipe = oldLen > 0 && newLen === 0;
  const isLargeDeletion = !isTestEnv() && oldLen > 1000 && newLen < oldLen * 0.1;
  if ((isFullWipe || isLargeDeletion) && projectId) {
    // NOTE: 사용자 의도(전체/대량 삭제)를 차단하지 않는다. 삭제 직전 내용을 스냅샷으로
    // 보존해 복구 지점만 남기고 저장을 진행한다. 이전에는 저장을 throw로 막아
    // "저장됐는데 이전 상태로 렌더링"되는 혼란을 만들었다.
    try {
      const snapshotService = await loadSnapshotService();
      await snapshotService.createSnapshot({
        projectId,
        chapterId: input.id,
        content: oldContent,
        description: `대량 삭제 전 백업 ${new Date().toLocaleString()}`,
      });
    } catch (error) {
      chapterLogger.warn("Pre-deletion snapshot failed; saving anyway", {
        chapterId: input.id,
        oldLen,
        error,
      });
    }
    chapterLogger.warn("Large deletion detected; pre-deletion snapshot saved", {
      chapterId: input.id,
      oldLen,
      newLen,
    });
    void broadcastSaveProtected({
      chapterId: input.id,
      projectId,
      reason: isFullWipe ? "empty-wipe" : "large-deletion",
      oldLength: oldLen,
      newLength: newLen,
    });
  }

  updateData.content = input.content;
  updateData.wordCount = input.content.length;
  if (!projectId || SKIP_NONCRITICAL_DERIVED_ON_STRESS) return;

  fireAndForget(
    trackKeywordAppearances(input.id, input.content, projectId),
    "chapter:update:track-keyword-appearances",
  );
};
