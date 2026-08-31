import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { cn } from "@shared/types/utils";
import { DraggableItem } from "@shared/ui/DraggableItem";
import { MoreVertical, Edit2, Copy, Trash2 } from "lucide-react";
import { useFloatingMenu } from "@renderer/shared/hooks/useFloatingMenu";
import { useDialog } from "@shared/ui/useDialog";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";
import { useChapterManagement } from "@renderer/features/manuscript/hooks/useChapterManagement";
import { ensureChapterContent } from "@renderer/features/manuscript/stores/chapterContentStore";

type ChapterAction = "rename" | "duplicate" | "delete";

export default function SidebarChapterList() {
    const { t } = useTranslation();
    const dialog = useDialog();
    const { menuOpenId, menuPosition, menuRef, closeMenu, toggleMenuByElement } = useFloatingMenu<HTMLButtonElement>();
    const setManuscriptMenuOpen = useUIStore((state) => state.setManuscriptMenuOpen);

    const {
        chapters,
        activeChapterId,
        handleSelectChapter,
        handleRenameChapter,
        handleDuplicateChapter,
        handleDeleteChapter,
    } = useChapterManagement();

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");

    useEffect(() => {
        setManuscriptMenuOpen(Boolean(menuOpenId));
        return () => {
            setManuscriptMenuOpen(false);
        };
    }, [menuOpenId, setManuscriptMenuOpen]);

    const handleAction = async (action: ChapterAction, id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        closeMenu();

        if (action === "rename") {
            const current = chapters.find((chapter) => chapter.id === id);
            if (current) {
                setEditingId(id);
                setEditValue(current.title || "");
            }
            return;
        }

        if (action === "duplicate") {
            void handleDuplicateChapter(id);
            return;
        }

        const confirmed = await dialog.confirm({
            title: t("sidebar.menu.delete"),
            message: t("sidebar.prompt.deleteConfirm"),
            isDestructive: true,
        });

        if (confirmed) {
            void handleDeleteChapter(id);
        }
    };

    const commitRename = () => {
        if (editingId && editValue.trim()) {
            void handleRenameChapter(editingId, editValue.trim());
        }
        setEditingId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            commitRename();
        } else if (e.key === "Escape") {
            setEditingId(null);
        }
    };

    return (
        <div className="flex flex-col relative w-full h-full">
            {menuOpenId !== null ? (
                <div
                    className="fixed inset-0 z-dropdown bg-transparent"
                    onPointerDown={closeMenu}
                />
            ) : null}

            {/* NOTE: 이 메뉴는 반드시 body로 portal한다. editor 레이아웃의 사이드바는
                FocusHoverSidebar의 `will-change-transform [contain:layout_paint]` 안에
                들어가는데, transform/contain은 `position: fixed` 자손의 containing block이
                되고 paint까지 클리핑한다. 그래서 inline으로 두면 z-index를 아무리 올려도
                메뉴가 사이드바 박스 안에 갇히고, 버튼 오른쪽(rect.right + 8) 좌표가
                사이드바 기준으로 재해석돼 잘려 보인다. */}
            {menuOpenId !== null
                ? createPortal(
                    <div
                        ref={menuRef}
                        className="fixed z-dropdown bg-panel border border-border rounded-panel shadow-lg min-w-[160px] p-1.5 animate-in fade-in zoom-in-95 duration-100 flex flex-col text-fg"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                    >
                        <div
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-control transition-all hover:bg-surface-hover hover:text-fg"
                            onClick={(e) => void handleAction("rename", menuOpenId, e)}
                        >
                            <Edit2 className="w-3.5 h-3.5" /> {t("sidebar.menu.rename")}
                        </div>
                        <div
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-control transition-all hover:bg-surface-hover hover:text-fg"
                            onClick={(e) => void handleAction("duplicate", menuOpenId, e)}
                        >
                            <Copy className="w-3.5 h-3.5" /> {t("sidebar.menu.duplicate")}
                        </div>
                        <div
                            className="flex items-center gap-2.5 px-3 py-2 text-[13px] cursor-pointer rounded-control transition-all hover:bg-surface-hover hover:text-red-600 text-red-500"
                            onClick={(e) => void handleAction("delete", menuOpenId, e)}
                        >
                            <Trash2 className="w-3.5 h-3.5" /> {t("sidebar.menu.delete")}
                        </div>
                    </div>,
                    document.body,
                )
                : null}

            <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar pb-4">
                {chapters.map((chapter) => {
                    const isActive = chapter.id === activeChapterId;
                    const isEditing = chapter.id === editingId;

                    return (
                        <DraggableItem
                            key={chapter.id}
                            id={`chapter-${chapter.id}`}
                            data={{ type: "chapter", id: chapter.id, title: chapter.title || "Untitled" }}
                        >
                            <div
                                className={cn(
                                    "group flex items-center justify-between px-3 py-2 rounded-control transition-colors cursor-pointer text-sm select-none min-h-[36px]",
                                    isActive ? "bg-accent/10 text-accent font-medium" : "text-muted hover:bg-surface-hover hover:text-fg"
                                )}
                                // NOTE: click보다 먼저 발화하는 pointerdown에서 본문을 미리 받는다.
                                // 사람의 down→up 간격(수십 ms) 동안 로컬 조회가 끝나므로 전환 시
                                // 로딩 게이트가 화면에 드러나지 않는다. hover 프리페치는 리스트를
                                // 훑기만 해도 조회가 쏟아지므로 쓰지 않는다.
                                onPointerDown={() => {
                                    void ensureChapterContent(chapter.id);
                                }}
                                onClick={() => {
                                    handleSelectChapter(chapter.id);
                                    useUIStore.getState().setMainView({ type: "editor" });
                                }}
                            >
                                {isEditing ? (
                                    <input
                                        autoFocus
                                        type="text"
                                        value={editValue}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={handleKeyDown}
                                        className="bg-app border border-accent/50 rounded px-1 py-0.5 w-full text-fg outline-hidden text-sm h-6 leading-none"
                                    />
                                ) : (
                                    <span className="truncate flex-1 leading-normal">{chapter.title || t("project.defaults.untitled")}</span>
                                )}

                                {!isEditing && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleMenuByElement(chapter.id, e.currentTarget);
                                        }}
                                        className={cn(
                                            "opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-xs hover:bg-app/50",
                                            (menuOpenId === chapter.id) && "opacity-100"
                                        )}
                                    >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </DraggableItem>
                    );
                })}
            </div>
        </div>
    );
}
