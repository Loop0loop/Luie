import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Trash2, GripVertical } from "lucide-react";
import { BufferedTextArea, BufferedInput } from "../../common/BufferedInput";
import { useProjectStore } from "../../../stores/projectStore";
import { worldPackageStorage } from "../../../services/worldPackageStorage";

interface PlotCard {
  id: string;
  content: string;
}

interface PlotColumn {
  id: string;
  title: string;
  cards: PlotCard[];
}

export function PlotBoard() {
  const { t } = useTranslation();
  const { currentItem: currentProject } = useProjectStore();
  const defaultColumns = useMemo<PlotColumn[]>(
    () => [
      {
        id: "act1",
        title: t("world.plot.act1Title"),
        cards: [
          { id: "c1", content: t("world.plot.card.act1_1") },
          { id: "c2", content: t("world.plot.card.act1_2") },
        ],
      },
      {
        id: "act2",
        title: t("world.plot.act2Title"),
        cards: [{ id: "c3", content: t("world.plot.card.act2_1") }],
      },
      {
        id: "act3",
        title: t("world.plot.act3Title"),
        cards: [{ id: "c4", content: t("world.plot.card.act3_1") }],
      },
    ],
    [t],
  );
  const [columns, setColumns] = useState<PlotColumn[]>(defaultColumns);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    if (!currentProject?.id) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const loaded = await worldPackageStorage.loadPlot(
        currentProject.id,
        currentProject.projectPath,
      );
      if (cancelled) return;
      setColumns(loaded.columns.length > 0 ? loaded.columns : defaultColumns);
      setIsHydrated(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProject?.id, currentProject?.projectPath, defaultColumns]);

  useEffect(() => {
    if (!currentProject?.id || !isHydrated) return;
    const timer = window.setTimeout(() => {
      void worldPackageStorage.savePlot(currentProject.id, currentProject.projectPath, { columns });
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [columns, currentProject?.id, currentProject?.projectPath, isHydrated]);

  const addColumn = () => {
    const newId = `act-${Date.now()}`;
    setColumns([...columns, {
      id: newId,
      title: `${t("world.plot.newAct")} ${columns.length + 1}`,
      cards: []
    }]);
  };

  const removeColumn = (colId: string) => {
      setColumns(columns.filter(c => c.id !== colId));
  };

  const updateColumnTitle = (colId: string, newTitle: string) => {
      setColumns(columns.map(c => c.id === colId ? { ...c, title: newTitle } : c));
  };

  const addCard = (colId: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: [
              ...col.cards,
              { id: Date.now().toString(), content: t("world.plot.newBeat") },
            ],
          };
        }
        return col;
      }),
    );
  };

  const updateCard = (colId: string, cardId: string, content: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.map((c) =>
              c.id === cardId ? { ...c, content } : c,
            ),
          };
        }
        return col;
      }),
    );
  };

  const deleteCard = (colId: string, cardId: string) => {
    setColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        return col;
      }),
    );
  };

  return (
    <div className="h-full flex flex-col bg-app overflow-hidden">
        {/* Horizontal Scroll Area */}
        <div 
            className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar"
            ref={(ref) => {
                if (ref) {
                    ref.addEventListener("wheel", (e) => {
                        if (e.deltaY !== 0) {
                            e.preventDefault();
                            ref.scrollLeft += e.deltaY;
                        }
                    }, { passive: false });
                }
            }}
        >
            <div className="h-full flex p-6 gap-6 w-fit min-w-full">
                {columns.map((col) => (
                    <div key={col.id} className="w-80 shrink-0 flex flex-col bg-sidebar border border-border rounded-xl shadow-sm max-h-full group/col">
                        {/* Column Header */}
                        <div className="p-3 flex items-center gap-2 border-b border-border bg-panel/50 rounded-t-xl">
                            <GripVertical className="text-muted cursor-grab hover:text-fg w-4 h-4" />
                            <BufferedInput
                                className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-fg uppercase tracking-wide"
                                value={col.title}
                                onSave={(val) => updateColumnTitle(col.id, val)}
                            />
                            <div className="flex items-center gap-1">
                                <span className="bg-element/80 px-1.5 py-0.5 rounded text-[10px] text-muted font-mono">{col.cards.length}</span>
                                <button 
                                    className="p-1 text-muted hover:text-error opacity-0 group-hover/col:opacity-100 transition-opacity"
                                    onClick={() => removeColumn(col.id)}
                                    title={t("world.plot.deleteAct")}
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        {/* Cards List - Vertical Scroll */}
                        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                            {col.cards.map((card) => (
                            <div key={card.id} className="bg-panel border border-border rounded-lg p-3 shadow-sm relative group hover:border-active transition-all hover:shadow-md">
                                <BufferedTextArea
                                className="w-full bg-transparent border-none resize-none text-sm text-fg leading-relaxed outline-none min-h-[60px]"
                                value={card.content}
                                onSave={(val) => updateCard(col.id, card.id, val)}
                                rows={3}
                                />
                                <button
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-hover text-muted hover:text-error transition-all"
                                onClick={() => deleteCard(col.id, card.id)}
                                >
                                <X className="w-3 h-3" />
                                </button>
                            </div>
                            ))}
                        </div>

                        {/* Footer Action */}
                        <button 
                            className="m-3 p-2 flex items-center justify-center gap-2 rounded-lg border border-dashed border-border text-xs text-muted font-medium hover:text-accent hover:border-accent hover:bg-accent/5 transition-all" 
                            onClick={() => addCard(col.id)}
                        >
                            <Plus className="w-4 h-4" /> {t("world.plot.addBeat")}
                        </button>
                    </div>
                ))}

                {/* Add Column Button */}
                <div 
                    className="w-16 shrink-0 flex items-center justify-center border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group"
                    onClick={addColumn}
                    title={t("world.plot.addAct")}
                >
                    <Plus className="w-8 h-8 text-muted group-hover:text-accent transition-colors" />
                </div>
            </div>
        </div>
        
        {/* Visual Bar / Scroll Indicator Area (Optional polished look) */}
        <div className="h-4 bg-sidebar border-t border-border shrink-0" />
    </div>
  );
}
