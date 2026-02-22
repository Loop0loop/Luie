import { Tag, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useMemo } from "react";
import { useMemoStore } from "@renderer/features/research/stores/memoStore";
import { useUIStore } from "@renderer/features/workspace/stores/uiStore";

export default function MemoMainView() {
    const { t } = useTranslation();
    const { notes, updateNote } = useMemoStore();
    const mainView = useUIStore((state) => state.mainView);
    const activeNoteId = mainView.type === "memo" ? mainView.id : null;

    const activeNote = useMemo(() =>
        notes.find((n) => n.id === activeNoteId),
        [notes, activeNoteId]
    );

    if (!activeNote) {
        return (
            <div className="flex items-center justify-center h-full text-muted">
                {t("memo.noSelection")}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-panel overflow-hidden max-w-4xl mx-auto w-full p-8">
            <div className="flex items-center gap-2 mb-4">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <input
                    className="bg-transparent border-none outline-none text-sm text-muted-foreground w-full placeholder:text-muted"
                    placeholder={t("memo.placeholder.tags")}
                    value={activeNote.tags.join(", ")}
                    onChange={(e) => {
                        const tags = e.target.value.split(",").map((tag) => tag.trim());
                        updateNote(activeNote.id, { tags });
                    }}
                />
            </div>

            <input
                className="w-full pt-2 pb-4 text-3xl font-extrabold border-none bg-transparent outline-none text-fg placeholder:text-muted"
                value={activeNote.title}
                onChange={(e) => updateNote(activeNote.id, { title: e.target.value })}
                placeholder={t("memo.placeholder.title")}
            />

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                <Clock className="w-3 h-3" />
                <span>{new Date(activeNote.updatedAt).toLocaleString()}</span>
            </div>

            <textarea
                className="flex-1 w-full border-none bg-transparent resize-none outline-none leading-relaxed text-lg text-secondary placeholder:text-muted font-serif"
                value={activeNote.content}
                onChange={(e) => updateNote(activeNote.id, { content: e.target.value })}
                placeholder={t("memo.placeholder.body")}
            />
        </div>
    );
}
