import { useMemo } from "react";
import { FileText, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@renderer/components/ui/button";
import { ScrollArea } from "@renderer/components/ui/scroll-area";
import type { ScrapMemo } from "@shared/types";
import { SidebarItem, SidebarSection } from "./SidebarPrimitives";

export function NotesSidebar({
  notes,
  selectedNoteId,
  onSelectNote,
  onCreateNote,
}: {
  notes: ScrapMemo[];
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
}) {
  const { t } = useTranslation();

  const groupedNotes = useMemo(() => {
    const uncategorizedLabel = t("research.graph.sidebar.notes.uncategorized");
    const groups: Record<string, ScrapMemo[]> = { [uncategorizedLabel]: [] };

    notes.forEach((note) => {
      if (note.tags?.length) {
        note.tags.forEach((tag) => {
          if (!groups[tag]) groups[tag] = [];
          groups[tag].push(note);
        });
      } else {
        groups[uncategorizedLabel].push(note);
      }
    });

    return {
      groups,
      uncategorizedLabel,
    };
  }, [notes, t]);

  return (
    <div className="flex flex-col h-full bg-background/50">
      <ScrollArea className="flex-1 pt-2">
        {Object.entries(groupedNotes.groups).map(([group, items]) =>
          items.length > 0 ? (
            <SidebarSection
              key={group}
              title={group}
              defaultOpen={group !== groupedNotes.uncategorizedLabel}
            >
              {items.map((note) => (
                <SidebarItem
                  key={note.id}
                  label={
                    note.title || t("research.graph.sidebar.notes.untitled")
                  }
                  icon={FileText}
                  isActive={selectedNoteId === note.id}
                  onClick={() => onSelectNote(note.id)}
                />
              ))}
            </SidebarSection>
          ) : null,
        )}
      </ScrollArea>
      <div className="p-3 border-t border-white/5 bg-black/10">
        <Button
          size="sm"
          variant="secondary"
          className="w-full h-8 text-[11px] font-black uppercase tracking-widest"
          onClick={onCreateNote}
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          {t("research.graph.sidebar.notes.newNote")}
        </Button>
      </div>
    </div>
  );
}
