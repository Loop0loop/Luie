import { Virtuoso } from "react-virtuoso";
import { Plus, Clock } from "lucide-react";
import { type TFunction } from "i18next";
import { cn } from "../../../../../shared/types/utils";
import SearchInput from "../../common/SearchInput";
import type { Note } from "./useMemoManager";

interface MemoSidebarListProps {
    t: TFunction;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    filteredNotes: Note[];
    activeNoteId: string;
    setActiveNoteId: (id: string) => void;
    handleAddNote: () => void;
}

export function MemoSidebarList({
    t,
    searchTerm,
    setSearchTerm,
    filteredNotes,
    activeNoteId,
    setActiveNoteId,
    handleAddNote,
}: MemoSidebarListProps) {
    return (
        <div className="h-full bg-sidebar border-r border-border flex flex-col content-visibility-auto contain-intrinsic-size-[1px_600px]">
            <div className="px-4 py-3 text-xs font-bold text-muted flex justify-between items-center uppercase tracking-wider">
                <span>{t("memo.sectionTitle")}</span>
                <Plus className="icon-sm cursor-pointer hover:text-fg transition-colors" onClick={handleAddNote} />
            </div>

            <div className="px-3 py-2">
                <SearchInput
                    variant="memo"
                    placeholder={t("memo.placeholder.search")}
                    value={searchTerm}
                    onChange={setSearchTerm}
                />
            </div>

            <div className="flex-1 min-h-0">
                <Virtuoso
                    data={filteredNotes}
                    style={{ height: "100%" }}
                    itemContent={(_index, note) => (
                        <div
                            className={cn(
                                "px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-element-hover overflow-hidden w-full box-border",
                                activeNoteId === note.id && "bg-active border-l-[3px] border-l-accent pl-3.25",
                            )}
                            onClick={() => setActiveNoteId(note.id)}
                        >
                            <div className="truncate" style={{ fontWeight: "var(--memo-title-font-weight)", marginBottom: 4 }}>
                                {note.title || t("project.defaults.untitled")}
                            </div>
                            <div className="flex gap-1 flex-wrap mb-1">
                                {note.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        style={{
                                            fontSize: "var(--memo-tag-font-size)",
                                            padding: "2px 4px",
                                            background: "var(--bg-element-hover)",
                                            borderRadius: 2,
                                        }}
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                            <div
                                style={{
                                    fontSize: "var(--memo-date-font-size)",
                                    color: "var(--text-tertiary)",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                }}
                            >
                                <Clock
                                    style={{
                                        width: "var(--memo-date-icon-size)",
                                        height: "var(--memo-date-icon-size)",
                                    }}
                                />
                                {new Date(note.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                    )}
                />
            </div>
        </div>
    );
}
