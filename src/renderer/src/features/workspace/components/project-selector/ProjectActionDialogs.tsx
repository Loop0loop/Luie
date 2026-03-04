import { useTranslation } from "react-i18next";
import { Modal } from "@shared/ui/Modal";
import type { ProjectSelectorState, ProjectSelectorActions } from "../../hooks/useProjectSelector";

interface ProjectActionDialogsProps {
    state: ProjectSelectorState;
    actions: ProjectSelectorActions;
}

export function ProjectActionDialogs({ state, actions }: ProjectActionDialogsProps) {
    const { t } = useTranslation();

    const {
        renameDialog,
        setRenameDialog,
        deleteDialog,
        setDeleteDialog,
        renameError,
        isRenaming,
        renameFormId,
    } = state;

    const {
        handleRename,
        handleDeleteOrRemove,
    } = actions;

    return (
        <>
            <Modal
                isOpen={renameDialog.isOpen}
                onClose={() => setRenameDialog((prev) => ({ ...prev, isOpen: false }))}
                title={t("settings.projectTemplate.dialog.renameTitle")}
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button
                            className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg"
                            onClick={() => setRenameDialog((prev) => ({ ...prev, isOpen: false }))}
                            disabled={isRenaming}
                        >
                            {t("settings.projectTemplate.actions.cancel")}
                        </button>
                        <button
                            className="px-4 py-2 bg-accent border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
                            type="submit"
                            form={renameFormId}
                            disabled={isRenaming}
                        >
                            {isRenaming ? t("settings.projectTemplate.actions.saving") : t("settings.projectTemplate.actions.save")}
                        </button>
                    </div>
                }
            >
                <form id={renameFormId} onSubmit={handleRename} className="flex flex-col gap-3">
                    {renameError && (
                        <div className="text-xs text-danger-fg">{renameError}</div>
                    )}
                    <input type="hidden" name="projectId" value={renameDialog.projectId} />
                    <input
                        key={`${renameDialog.isOpen}-${renameDialog.currentTitle}`}
                        name="title"
                        defaultValue={renameDialog.currentTitle}
                        className="w-full p-2.5 bg-input border border-border rounded-md text-sm outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/20"
                        autoFocus
                        disabled={isRenaming}
                    />
                </form>
            </Modal>

            <Modal
                isOpen={deleteDialog.isOpen}
                onClose={() =>
                    setDeleteDialog((prev) => ({
                        ...prev,
                        isOpen: false,
                        mode: "delete",
                        deleteFile: false,
                    }))
                }
                title={
                    deleteDialog.mode === "removeMissing"
                        ? t("settings.projectTemplate.dialog.removeMissingTitle")
                        : t("settings.projectTemplate.dialog.deleteTitle")
                }
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <button
                            className="px-4 py-2 bg-transparent border border-border rounded-md text-muted text-[13px] cursor-pointer transition-all hover:bg-hover hover:text-fg"
                            onClick={() =>
                                setDeleteDialog((prev) => ({
                                    ...prev,
                                    isOpen: false,
                                    mode: "delete",
                                    deleteFile: false,
                                }))
                            }
                        >
                            {t("settings.projectTemplate.actions.cancel")}
                        </button>
                        <button
                            className="px-4 py-2 bg-red-500 border-none rounded-md text-white text-[13px] font-medium cursor-pointer transition-all hover:bg-red-600"
                            onClick={handleDeleteOrRemove}
                        >
                            {deleteDialog.mode === "removeMissing"
                                ? t("settings.projectTemplate.removeMissingConfirmLabel")
                                : t("settings.projectTemplate.deleteConfirmLabel")}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p>
                        {deleteDialog.mode === "removeMissing"
                            ? t("settings.projectTemplate.removeMissingConfirm", { title: deleteDialog.projectTitle })
                            : t("settings.projectTemplate.deleteConfirm", { title: deleteDialog.projectTitle })}
                    </p>
                    {deleteDialog.mode === "delete" && (
                        <label className="flex items-center gap-2 text-xs text-muted select-none">
                            <input
                                type="checkbox"
                                checked={deleteDialog.deleteFile}
                                onChange={(event) =>
                                    setDeleteDialog((prev) => ({
                                        ...prev,
                                        deleteFile: event.target.checked,
                                    }))
                                }
                            />
                            {t("settings.projectTemplate.deleteFileOption")}
                        </label>
                    )}
                </div>
            </Modal>
        </>
    );
}
