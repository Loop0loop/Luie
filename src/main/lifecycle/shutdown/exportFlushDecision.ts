export type ProjectExportFlushResult = {
  total: number;
  flushed: number;
  failed: number;
  timedOut: boolean;
};

type ExportQuitDialogOptions = {
  type: "question" | "warning";
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  defaultId: number;
  cancelId: number;
  noLink: boolean;
};

const needsUserDecision = (result: ProjectExportFlushResult) =>
  result.failed > 0 || result.timedOut;

export async function resolveProjectExportQuitDecision(
  flush: (timeoutMs: number) => Promise<ProjectExportFlushResult>,
  showDialog: (
    options: ExportQuitDialogOptions,
  ) => Promise<{ response: number }>,
  softTimeoutMs: number,
  hardTimeoutMs: number,
): Promise<"continue" | "cancel"> {
  const soft = await flush(softTimeoutMs);
  if (!needsUserDecision(soft)) return "continue";

  const failed = soft.failed > 0;
  const response = await showDialog({
    type: "question",
    title: failed ? "프로젝트 파일 저장 실패" : "저장 지연 감지",
    message: failed
      ? `${soft.failed}개의 프로젝트 파일 저장에 실패했습니다.`
      : "프로젝트 파일 저장이 지연되고 있습니다.",
    detail:
      "기본값은 종료 취소입니다. 재시도하거나, 저장을 생략하고 종료할 수 있습니다.",
    buttons: ["재시도", "종료 취소", "저장 생략 후 종료"],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });
  if (response.response === 2) return "continue";
  if (response.response !== 0) return "cancel";

  const hard = await flush(hardTimeoutMs);
  if (!needsUserDecision(hard)) return "continue";

  const hardFailed = hard.failed > 0;
  const hardResponse = await showDialog({
    type: "warning",
    title: hardFailed ? "프로젝트 파일 저장 실패 지속" : "저장 지연 지속",
    message: hardFailed
      ? `${hard.failed}개의 프로젝트 파일 저장이 다시 실패했습니다.`
      : "저장이 아직 완료되지 않았습니다.",
    detail: "안전을 위해 종료를 취소하는 것을 권장합니다.",
    buttons: ["종료 취소", "저장 생략 후 종료"],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  });
  return hardResponse.response === 1 ? "continue" : "cancel";
}
