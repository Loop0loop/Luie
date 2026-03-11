import { useTranslation } from "react-i18next";
import type { Project } from "@shared/types";

interface ProjectContextMenuProps {
    project: Project;
    menuRef: React.RefObject<HTMLElement | null>;
    menuPosition: { x: number; y: number };
    closeMenu: () => void;
    onOpenProject?: (project: Project) => void;
    onRepairPath: (project: Project) => void;
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
    onRenameRequest,
    onDeleteRequest,
}: ProjectContextMenuProps) {
    const { t } = useTranslation();

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
            {project.pathMissing && (
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
                {project.pathMissing
                    ? t("settings.projectTemplate.context.removeMissing")
                    : t("settings.projectTemplate.context.delete")}
            </div>
        </div>
    );
}
