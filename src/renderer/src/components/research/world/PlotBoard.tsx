
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X } from "lucide-react";
import { BufferedTextArea } from "../../common/BufferedInput";

export function PlotBoard() {
  const { t } = useTranslation();
  const [columns, setColumns] = useState(() => [
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
  ]);

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
    <div className="h-full flex overflow-x-auto p-4 gap-4 bg-app">
      {columns.map((col) => (
        <div key={col.id} className="w-70 shrink-0 flex flex-col bg-sidebar border border-border rounded-lg max-h-full">
          <div className="p-3 font-bold text-sm text-fg uppercase flex justify-between items-center border-b border-border bg-panel/50">
            {col.title}
            <span className="bg-element/80 px-1.5 py-0.5 rounded text-[10px] text-muted">{col.cards.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-2">
            {col.cards.map((card) => (
              <div key={card.id} className="bg-panel border border-border rounded p-2 shadow-sm relative group hover:border-active transition-colors">
                <BufferedTextArea
                  className="w-full bg-transparent border-none resize-none text-sm text-fg leading-relaxed outline-none mb-1"
                  value={card.content}
                  onSave={(val) => updateCard(col.id, card.id, val)}
                  rows={2}
                />
                <button
                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-hover text-muted hover:text-error transition-all"
                  onClick={() => deleteCard(col.id, card.id)}
                >
                  <X className="icon-xs" />
                </button>
              </div>
            ))}
          </div>
          <button className="m-2 p-2 flex items-center justify-center gap-1.5 rounded border border-dashed border-border text-xs text-muted hover:text-accent hover:border-accent hover:bg-element-hover transition-all" onClick={() => addCard(col.id)}>
            <Plus className="icon-sm" /> {t("world.plot.addBeat")}
          </button>
        </div>
      ))}
    </div>
  );
}
