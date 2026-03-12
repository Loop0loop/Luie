import { useTranslation } from "react-i18next";
import type { LuieWritableContainerKind, Project } from "@shared/types";

interface ProjectContextMenuProps {
    project: Project;
    menuRef: React.RefObject<HTMLElement | null>;
    menuPosition: { x: number; y: number };
    closeMenu: () => void;
    onOpenProject?: (project: Project) => void;
    onRepairPath: (project: Project) => void;
    onAttachLuie: (project: Project) => void;
    onMaterializeLuie: (
        project: Project,
        containerKind: LuieWritableContainerKind,
    ) => void;
    onRenameRequest: (project: Project) => void;
    onDeleteRequest: (project: Project) => void;
}

export function ProjectContextMenu({
    project,
    menuRef,
    menuPosition,
    closeMenu,
    onOpenProject,
    onRepairPath,
    onAttachLuie,
    onMaterializeLuie,
    onRenameRequest,
    onDeleteRequest,
}: ProjectContextMenuProps) {
    const { t } = useTranslation();
    const canRepairAttachment =
        project.attachmentStatus === "missing-attachment" ||
        project.attachmentStatus === "invalid-attachment";
    const canAttachLuie = project.attachmentStatus === "detached";
    const canMaterializeLuie =
        project.attachmentStatus === "detached" ||
        project.attachmentStatus === "missing-attachment" ||
        project.attachmentStatus === "invalid-attachment";

    return (
        <div
            ref={menuRef as React.Ref<HTMLDivElement>}
            className="fixed z-[9999] min-w-35 bg-surface border border-border rounded-[10px] p-1.5 shadow-lg"
            style={{ top: menuPosition.y, left: menuPosition.x }}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                onClick={() => {
                    closeMenu();
                    onOpenProject?.(project);
                }}
            >
                {t("settings.projectTemplate.context.open")}
            </div>
            {canRepairAttachment && (
                <div
                    className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                    onClick={() => {
                        closeMenu();
                        onRepairPath(project);
                    }}
                >
                    {t("settings.projectTemplate.context.repairPath")}
                </div>
            )}
            {canAttachLuie && (
                <div
                    className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                    onClick={() => {
                        closeMenu();
                        onAttachLuie(project);
                    }}
                >
                    {t("settings.projectTemplate.context.attachLuie")}
                </div>
            )}
            {canMaterializeLuie && (
                <>
                    <div
                        className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                        onClick={() => {
                            closeMenu();
                            onMaterializeLuie(project, "package-v1");
                        }}
                    >
                        {t("settings.projectTemplate.context.materializeLuiePackage")}
                    </div>
                    <div
                        className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                        onClick={() => {
                            closeMenu();
                            onMaterializeLuie(project, "sqlite-v2");
                        }}
                    >
                        {t("settings.projectTemplate.context.materializeLuieSqlite")}
                    </div>
                </>
            )}
            <div
                className="px-2.5 py-2.5 rounded-lg text-[13px] text-fg cursor-pointer select-none hover:bg-active"
                onClick={() => {
                    closeMenu();
                    onRenameRequest(project);
                }}
            >
                {t("settings.projectTemplate.context.rename")}
            </div>
            <div className="h-px bg-border my-1.5 mx-1" />
            <div
                className="px-2.5 py-2.5 rounded-lg text-[13px] text-danger-fg cursor-pointer select-none hover:bg-active"
                onClick={() => {
                    closeMenu();
                    onDeleteRequest(project);
                }}
            >
                {canRepairAttachment
                    ? t("settings.projectTemplate.context.removeMissing")
                    : t("settings.projectTemplate.context.delete")}
            </div>
        </div>
    );
}
