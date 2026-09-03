import { useTranslation } from "react-i18next";
import luieIcon from "../../../../assets/luie-icon.png";

interface PrepareStepProps {
  projectTitle: string;
  onProjectTitleChange: (title: string) => void;
  isCreatingProject: boolean;
  projectError: string | null;
  onCreateAndStart: () => void;
  onSkip: () => void;
}

export function PrepareStep({
  projectTitle,
  onProjectTitleChange,
  isCreatingProject,
  projectError,
  onCreateAndStart,
  onSkip,
}: PrepareStepProps) {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6">
      <img
        src={luieIcon}
        alt=""
        className="h-14 w-14 rounded-panel shadow-panel"
      />
      <div className="space-y-1 text-center">
        <h1 className="text-xl font-bold tracking-tight">
          {t("startupWizard.onboarding.prepareTitle")}
        </h1>
        <p className="text-[13px] text-muted">
          {t("startupWizard.onboarding.prepareBody")}
        </p>
      </div>

      <div className="w-full max-w-md space-y-3">
        <input
          type="text"
          value={projectTitle}
          onChange={(event) => onProjectTitleChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              onCreateAndStart();
            }
          }}
          placeholder={t("startupWizard.onboarding.preparePlaceholder")}
          autoFocus
          className="w-full rounded-control border border-border bg-surface px-4 py-2.5 text-sm text-fg outline-none transition-colors placeholder:text-subtle focus:border-accent"
        />
        {projectError && (
          <p className="break-all text-xs text-danger-fg">{projectError}</p>
        )}
        <button
          type="button"
          onClick={onCreateAndStart}
          disabled={!projectTitle.trim() || isCreatingProject}
          className="w-full rounded-control bg-accent px-6 py-2.5 text-sm font-medium text-on-accent transition-colors hover:bg-accent-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isCreatingProject
            ? t("startupWizard.onboarding.prepareCreating")
            : t("startupWizard.onboarding.prepareCreateCta")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          className="mx-auto block text-xs text-muted underline-offset-4 hover:text-fg hover:underline"
        >
          {t("startupWizard.onboarding.prepareSkip")}
        </button>
      </div>
    </div>
  );
}
