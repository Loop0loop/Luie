import type { TFunction } from "i18next";
import type { LlmModelDownloadStatus, LlmModelSettingsView } from "@shared/types";

interface ModelTabProps {
  t: TFunction;
  modelView: LlmModelSettingsView;
  isBusy: boolean;
  manualModelPath: string;
  onChangeManualPath: (value: string) => void;
  onRefresh: () => void;
  onDownloadDefault: () => void;
  onSaveManualPath: () => void;
  onSelectModel: (modelPath: string, modelId: string) => void;
  hfToken: string;
  onChangeHfToken: (value: string) => void;
  onSaveHfToken: () => void;
  downloadStatus: LlmModelDownloadStatus;
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(2)} ${units[unit]}`;
}

export function ModelTab(props: ModelTabProps) {
  const {
    modelView,
    isBusy,
    manualModelPath,
    onChangeManualPath,
    onRefresh,
    onDownloadDefault,
    onSaveManualPath,
    onSelectModel,
    hfToken,
    onChangeHfToken,
    onSaveHfToken,
    downloadStatus,
    t,
  } = props;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-fg">모델 저장소</h3>
        <p className="text-sm text-muted">
          {t("settings.model.description", "로컬 GGUF 모델을 관리하고 기본 모델을 설정합니다.")}
        </p>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted break-all">
          {modelView.modelsDir || "-"}
        </div>
        <p className="text-xs text-muted">
          macOS: ~/Library/Application Support/luie/models · Windows: %APPDATA%\\luie\\models
        </p>
        <div className="flex gap-2">
          <button
            onClick={onRefresh}
            disabled={isBusy}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            새로고침
          </button>
          <button
            onClick={onDownloadDefault}
            disabled={isBusy}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            기본 모델 다운로드 (Qwen3 4B Q4_K_M)
          </button>
        </div>
        {downloadStatus.active && (
          <div className="rounded-md border border-border bg-panel px-3 py-2 text-sm">
            <div className="mb-1">다운로드 중: {downloadStatus.fileName}</div>
            <div className="h-2 w-full rounded bg-surface">
              <div
                className="h-2 rounded bg-accent transition-all"
                style={{ width: `${downloadStatus.percent ?? 0}%` }}
              />
            </div>
            <div className="mt-1 text-xs text-muted">
              {formatBytes(downloadStatus.downloadedBytes)}
              {downloadStatus.totalBytes ? ` / ${formatBytes(downloadStatus.totalBytes)}` : ""}
              {downloadStatus.percent !== null ? ` (${downloadStatus.percent.toFixed(1)}%)` : ""}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-fg">Hugging Face 토큰</h3>
        <p className="text-xs text-muted">
          게이트드 모델/레이트리밋 환경에서 필요합니다. 토큰은 OS 보안 저장소 기반으로 암호화 저장됩니다.
        </p>
        <div className="flex gap-2">
          <input
            type="password"
            value={hfToken}
            onChange={(e) => onChangeHfToken(e.target.value)}
            className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-sm"
            placeholder="hf_xxx"
          />
          <button
            onClick={onSaveHfToken}
            disabled={isBusy}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            토큰 저장
          </button>
        </div>
        <p className="text-xs text-muted">
          저장 상태: {modelView.hasHuggingFaceToken ? "저장됨" : "미설정"}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-fg">기본 모델 경로</h3>
        <div className="flex gap-2">
          <input
            value={manualModelPath}
            onChange={(e) => onChangeManualPath(e.target.value)}
            className="flex-1 rounded-md border border-border bg-panel px-3 py-2 text-sm"
            placeholder="/Users/.../models/your-model.gguf"
          />
          <button
            onClick={onSaveManualPath}
            disabled={isBusy}
            className="px-3 py-2 rounded-md border border-border text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            저장
          </button>
        </div>
        <p className="text-xs text-muted break-all">
          현재 기본 모델: {modelView.defaultModelPath ?? "(미설정)"}
        </p>
      </section>

      <section className="space-y-3">
        <h3 className="text-lg font-semibold text-fg">로컬 모델 목록</h3>
        {modelView.models.length === 0 ? (
          <p className="text-sm text-muted">모델이 없습니다. 기본 모델 다운로드를 먼저 실행하세요.</p>
        ) : (
          <div className="space-y-2">
            {modelView.models.map((model) => (
              <div
                key={model.path}
                className="rounded-lg border border-border bg-surface px-4 py-3 flex items-start justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{model.fileName}</p>
                  <p className="text-xs text-muted break-all">{model.path}</p>
                  <p className="text-xs text-muted">
                    {formatBytes(model.sizeBytes)} · {new Date(model.modifiedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => onSelectModel(model.path, model.id)}
                  disabled={isBusy || model.isDefault}
                  className="shrink-0 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-surface-hover disabled:opacity-50"
                >
                  {model.isDefault ? "사용 중" : "기본으로 설정"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
