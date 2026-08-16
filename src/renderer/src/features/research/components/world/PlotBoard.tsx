import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, X, Trash2, GripVertical } from "lucide-react";
import { api } from "@shared/api";
import { BufferedTextArea, BufferedInput } from "@shared/ui/BufferedInput";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { useToast } from "@shared/ui/ToastContext";
import {
  preserveUnmountSave,
  registerSaveBufferFlush,
} from "@shared/ui/saveBufferRegistry";

interface PlotCard {
  id: string;
  content: string;
}

interface PlotColumn {
  id: string;
  title: string;
  cards: PlotCard[];
}

interface PendingPlotSave {
  projectId: string;
  projectPath: string | null;
  columns: PlotColumn[];
}

export function PlotBoard() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const currentProject = useProjectStore((state) => state.currentItem);
  const projectId = currentProject?.id;
  const luieAttachmentPath = getReadableLuieAttachmentPath(currentProject);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
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
  const [editableScope, setEditableScope] = useState<string | null>(null);
  const columnsRef = useRef(columns);
  const columnsByScopeRef = useRef(new Map<string, PlotColumn[]>());
  const hydratedScopesRef = useRef(new Set<string>());
  const mutationGenerationByScopeRef = useRef(new Map<string, number>());
  const activeScopeRef = useRef<string | null>(null);
  const pendingPlotSavesRef = useRef<PendingPlotSave[]>([]);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const flushPlotRef = useRef<() => Promise<void>>(async () => undefined);
  const projectScope = projectId
    ? `${projectId}\0${luieAttachmentPath ?? ""}`
    : null;

  useLayoutEffect(() => {
    if (!projectId || !projectScope) {
      return;
    }

    let cancelled = false;
    const scopeChanged = activeScopeRef.current !== projectScope;
    activeScopeRef.current = projectScope;
    const pendingAtLoadStart = pendingPlotSavesRef.current.find(
      (save) =>
        save.projectId === projectId &&
        save.projectPath === luieAttachmentPath,
    );
    if (scopeChanged) {
      const cachedColumns = columnsByScopeRef.current.get(projectScope);
      const transitionColumns =
        pendingAtLoadStart?.columns ?? cachedColumns ?? defaultColumns;
      if (pendingAtLoadStart || cachedColumns) {
        hydratedScopesRef.current.add(projectScope);
        setEditableScope(projectScope);
      } else {
        setEditableScope(null);
      }
      columnsRef.current = transitionColumns;
      setColumns(transitionColumns);
    }
    const loadGeneration = mutationGenerationByScopeRef.current.get(
      projectScope,
    );
    void flushPlotRef.current().catch(() => undefined);
    void (async () => {
      const loaded = await worldPackageStorage.loadPlot(
        projectId,
        luieAttachmentPath,
      );
      if (cancelled) return;
      if (
        mutationGenerationByScopeRef.current.get(projectScope) !==
        loadGeneration
      ) {
        return;
      }
      const pending = pendingPlotSavesRef.current.find(
        (save) =>
          save.projectId === projectId &&
          save.projectPath === luieAttachmentPath,
      );
      const nextColumns = pending
        ? pending.columns
        : pendingAtLoadStart
          ? pendingAtLoadStart.columns
        : loaded.columns.length > 0
          ? loaded.columns
          : defaultColumns;
      columnsByScopeRef.current.set(projectScope, nextColumns);
      hydratedScopesRef.current.add(projectScope);
      columnsRef.current = nextColumns;
      setColumns(nextColumns);
      if (activeScopeRef.current === projectScope) {
        setEditableScope(projectScope);
      }
    })().catch((error: unknown) => {
      if (!cancelled) {
        void api.logger.warn("Failed to load plot project scope", {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
        showToast(t("research.toast.worldSaveFailed"), "error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    projectId,
    luieAttachmentPath,
    defaultColumns,
    projectScope,
    showToast,
    t,
  ]);

  useEffect(() => {
    const element = scrollContainerRef.current;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      // NOTE: shift-scroll일 때만 가로 이동을 가로채 자연스러운 trackpad scroll을 보존한다.
      if (!event.shiftKey) return;
      if (event.deltaY === 0 && event.deltaX === 0) return;
      event.preventDefault();
      const delta = event.deltaY !== 0 ? event.deltaY : event.deltaX;
      element.scrollLeft += delta;
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      element.removeEventListener("wheel", handleWheel);
    };
  }, []);

  const flushPlot = async (): Promise<void> => {
    const inFlight = saveInFlightRef.current;
    if (inFlight) {
      await inFlight;
      return flushPlotRef.current();
    }
    const snapshot = pendingPlotSavesRef.current[0];
    if (!snapshot) return;

    const save = worldPackageStorage
      .savePlot(snapshot.projectId, snapshot.projectPath, {
        columns: snapshot.columns,
      })
      .catch((error: unknown) => {
        showToast(t("research.toast.worldSaveFailed"), "error");
        throw error;
      });
    saveInFlightRef.current = save;
    try {
      await save;
      if (pendingPlotSavesRef.current[0] === snapshot) {
        pendingPlotSavesRef.current.shift();
      }
    } finally {
      if (saveInFlightRef.current === save) saveInFlightRef.current = null;
    }
    return flushPlotRef.current();
  };

  useEffect(() => {
    flushPlotRef.current = flushPlot;
  });

  useEffect(() => registerSaveBufferFlush(() => flushPlotRef.current()), []);

  useEffect(
    () => () => {
      if (
        pendingPlotSavesRef.current.length === 0 &&
        !saveInFlightRef.current
      ) {
        return;
      }
      preserveUnmountSave(flushPlotRef.current(), () =>
        flushPlotRef.current(),
      );
    },
    [],
  );

  const commitColumns = (
    update: (current: PlotColumn[]) => PlotColumn[],
  ): Promise<void> => {
    if (
      !projectId ||
      !projectScope ||
      !hydratedScopesRef.current.has(projectScope)
    ) {
      return Promise.resolve();
    }
    const nextColumns = update(
      columnsByScopeRef.current.get(projectScope) ?? columnsRef.current,
    );
    columnsByScopeRef.current.set(projectScope, nextColumns);
    mutationGenerationByScopeRef.current.set(
      projectScope,
      (mutationGenerationByScopeRef.current.get(projectScope) ?? 0) + 1,
    );
    const pending: PendingPlotSave = {
      projectId,
      projectPath: luieAttachmentPath,
      columns: nextColumns,
    };
    const pendingIndex = pendingPlotSavesRef.current.findIndex(
      (save) =>
        save.projectId === pending.projectId &&
        save.projectPath === pending.projectPath,
    );
    if (pendingIndex === -1) pendingPlotSavesRef.current.push(pending);
    else pendingPlotSavesRef.current[pendingIndex] = pending;
    if (activeScopeRef.current === projectScope) {
      columnsRef.current = nextColumns;
      setColumns(nextColumns);
    }
    return flushPlot();
  };

  const addColumn = () => {
    void commitColumns((prev) => {
      const newId = `act-${Date.now()}`;
      return [
        ...prev,
        {
          id: newId,
          title: `${t("world.plot.newAct")} ${prev.length + 1}`,
          cards: [],
        },
      ];
    }).catch(() => undefined);
  };

  const removeColumn = (colId: string) => {
    void commitColumns((prev) =>
      prev.filter((column) => column.id !== colId),
    ).catch(() => undefined);
  };

  const updateColumnTitle = (colId: string, newTitle: string): Promise<void> =>
    commitColumns((prev) =>
      prev.map((column) =>
        column.id === colId ? { ...column, title: newTitle } : column,
      ),
    );

  const addCard = (colId: string) => {
    void commitColumns((cols) =>
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
    ).catch(() => undefined);
  };

  const updateCard = (
    colId: string,
    cardId: string,
    content: string,
  ): Promise<void> =>
    commitColumns((cols) =>
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

  const deleteCard = (colId: string, cardId: string) => {
    void commitColumns((cols) =>
      cols.map((col) => {
        if (col.id === colId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        return col;
      }),
    ).catch(() => undefined);
  };

  return (
    <fieldset
      key={projectScope}
      disabled={editableScope !== projectScope}
      className="h-full min-w-0 m-0 p-0 border-0 flex flex-col bg-app overflow-hidden"
    >
      <div
        className="flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar"
        ref={scrollContainerRef}
      >
        <div className="h-full flex p-6 gap-6 w-fit min-w-full">
          {columns.map((col) => (
            <div
              key={col.id}
              className="w-80 shrink-0 flex flex-col bg-sidebar border border-border rounded-panel shadow-sm max-h-full group/col"
            >
              <div className="p-3 flex items-center gap-2 border-b border-border bg-panel/50 rounded-t-xl">
                <GripVertical className="text-muted cursor-grab hover:text-fg w-4 h-4" />
                <BufferedInput
                  className="flex-1 bg-transparent border-none outline-none font-bold text-sm text-fg uppercase tracking-wide"
                  value={col.title}
                  onSave={(val) => updateColumnTitle(col.id, val)}
                />
                <div className="flex items-center gap-1">
                  <span className="bg-element/80 px-1.5 py-0.5 rounded text-[10px] text-muted font-mono">
                    {col.cards.length}
                  </span>
                  <button
                    className="p-1 text-muted hover:text-error opacity-0 group-hover/col:opacity-100 transition-opacity"
                    onClick={() => removeColumn(col.id)}
                    title={t("world.plot.deleteAct")}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 custom-scrollbar">
                {col.cards.map((card) => (
                  <div
                    key={card.id}
                    className="bg-panel border border-border rounded-panel p-3 shadow-sm relative group hover:border-active transition-all hover:shadow-md"
                  >
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

              <button
                className="m-3 p-2 flex items-center justify-center gap-2 rounded-panel border border-dashed border-border text-xs text-muted font-medium hover:text-accent hover:border-accent hover:bg-accent/5 transition-all"
                onClick={() => addCard(col.id)}
              >
                <Plus className="w-4 h-4" /> {t("world.plot.addBeat")}
              </button>
            </div>
          ))}

          <button
            type="button"
            className="w-16 shrink-0 flex items-center justify-center border-2 border-dashed border-border rounded-panel cursor-pointer hover:border-accent hover:bg-accent/5 transition-all group"
            onClick={addColumn}
            title={t("world.plot.addAct")}
          >
            <Plus className="w-8 h-8 text-muted group-hover:text-accent transition-colors" />
          </button>
        </div>
      </div>

      <div className="h-4 bg-sidebar border-t border-border shrink-0" />
    </fieldset>
  );
}
