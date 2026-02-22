import { useState, useMemo, useEffect, useDeferredValue, useRef } from "react";
import { type TFunction } from "i18next";
import { api } from "../../../services/api";
import { worldPackageStorage } from "../../../services/worldPackageStorage";
import { DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS } from "../../../../../shared/constants";

export type Note = {
    id: string;
    title: string;
    content: string;
    tags: string[];
    updatedAt: string;
};

const defaultUpdatedAt = new Date().toISOString();

export function buildDefaultNotes(t: TFunction): Note[] {
    const rawNotes = t("memo.defaultNotes", { returnObjects: true }) as Array<Omit<Note, "updatedAt">>;
    return rawNotes.map((note) => ({
        ...note,
        tags: [...note.tags],
        updatedAt: defaultUpdatedAt,
    }));
}

export function useMemoManager(
    projectId: string | undefined,
    projectPath: string | null | undefined,
    defaultNotes: Note[],
    t: TFunction
) {
    const [notes, setNotes] = useState<Note[]>(defaultNotes);
    const [activeNoteId, setActiveNoteId] = useState<string>(defaultNotes[0]?.id ?? "1");
    const [searchTerm, setSearchTerm] = useState("");
    const deferredSearchTerm = useDeferredValue(searchTerm);

    useEffect(() => {
        if (!projectId) return;

        let cancelled = false;
        void (async () => {
            try {
                const loaded = await worldPackageStorage.loadScrapMemos(projectId, projectPath);
                if (cancelled) return;
                const effective = loaded.memos.length > 0 ? loaded.memos : defaultNotes;
                setNotes(effective);
                setActiveNoteId(effective[0]?.id ?? defaultNotes[0]?.id ?? "1");
            } catch (e) {
                api.logger.warn("Failed to load memos", e);
                if (!cancelled) {
                    setNotes(defaultNotes);
                    setActiveNoteId(defaultNotes[0]?.id ?? "1");
                }
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [defaultNotes, projectId, projectPath]);

    // Save notes (debounced)
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!projectId) return;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

        saveTimerRef.current = setTimeout(() => {
            void worldPackageStorage.saveScrapMemos(projectId, projectPath, { memos: notes });
        }, DEFAULT_BUFFERED_INPUT_DEBOUNCE_MS);

        return () => {
            if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        };
    }, [notes, projectId, projectPath]);

    const activeNote = useMemo(() => notes.find((n) => n.id === activeNoteId), [notes, activeNoteId]);

    const filteredNotes = useMemo(() => {
        if (!deferredSearchTerm) return notes;
        const query = deferredSearchTerm.toLowerCase();
        return notes.filter(
            (n) =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query)
        );
    }, [notes, deferredSearchTerm]);

    const handleAddNote = () => {
        const newId = String(Date.now());
        const newNote: Note = {
            id: newId,
            title: t("project.defaults.noteTitle"),
            content: "",
            tags: [],
            updatedAt: new Date().toISOString(),
        };
        setNotes([...notes, newNote]);
        setActiveNoteId(newId);
    };

    const updateActiveNote = (updates: Partial<Note>) => {
        setNotes((prevNotes) =>
            prevNotes.map((n) =>
                n.id === activeNoteId
                    ? { ...n, ...updates, updatedAt: updates.updatedAt ?? new Date().toISOString() }
                    : n
            )
        );
    };

    return {
        notes,
        setNotes,
        activeNoteId,
        setActiveNoteId,
        searchTerm,
        setSearchTerm,
        activeNote,
        filteredNotes,
        handleAddNote,
        updateActiveNote,
    };
}
