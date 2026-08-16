import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { api } from "@shared/api";
import { useProjectStore } from "@renderer/features/project/stores/projectStore";
import { BufferedTextArea, BufferedInput } from "@shared/ui/BufferedInput";
import { cn } from "@shared/types/utils";
import { Lock, Unlock, PenLine, FileText, Sparkles } from "lucide-react";
import { worldPackageStorage } from "@renderer/features/research/services/worldPackageStorage";
import type { WorldSynopsisData, WorldSynopsisStatus } from "@shared/types";
import { getReadableLuieAttachmentPath } from "@shared/projectAttachment";
import { useToast } from "@shared/ui/ToastContext";
import {
  preserveUnmountSave,
  registerSaveBufferFlush,
} from "@shared/ui/saveBufferRegistry";

interface PendingSynopsisSave {
  projectId: string;
  projectPath: string | null;
  data: WorldSynopsisData;
}

export function SynopsisEditor() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { currentItem: currentProject, update: updateProject } =
    useProjectStore(
      useShallow((state) => ({
        currentItem: state.currentItem,
        update: state.update,
      })),
    );
  const luieAttachmentPath = getReadableLuieAttachmentPath(currentProject);
  const [status, setStatus] = useState<WorldSynopsisStatus>("draft");
  const [isFocused, setIsFocused] = useState(false);
  const [genre, setGenre] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [logline, setLogline] = useState("");
  const [editableScope, setEditableScope] = useState<string | null>(null);
  const synopsisRef = useRef<WorldSynopsisData>({
    synopsis: currentProject?.description ?? "",
    status: "draft",
    genre: "",
    targetAudience: "",
    logline: "",
  });
  const synopsisByScopeRef = useRef(new Map<string, WorldSynopsisData>());
  const hydratedScopesRef = useRef(new Set<string>());
  const mutationGenerationByScopeRef = useRef(new Map<string, number>());
  const activeScopeRef = useRef<string | null>(null);
  const pendingSynopsisSavesRef = useRef<PendingSynopsisSave[]>([]);
  const saveInFlightRef = useRef<Promise<void> | null>(null);
  const flushSynopsisRef = useRef<() => Promise<void>>(async () => undefined);
  const descriptionRef = useRef(currentProject?.description ?? "");
  const projectId = currentProject?.id;
  const projectScope = projectId
    ? `${projectId}\0${luieAttachmentPath ?? ""}`
    : null;

  useLayoutEffect(() => {
    descriptionRef.current = currentProject?.description ?? "";
  }, [currentProject?.description]);

  useLayoutEffect(() => {
    if (!projectId || !projectScope) return;
    let cancelled = false;
    const fallback = descriptionRef.current;
    const applySynopsis = (
      source: WorldSynopsisData,
      cache = true,
    ): void => {
      const nextSynopsis: WorldSynopsisData = {
        synopsis: source.synopsis ?? fallback,
        status: source.status ?? "draft",
        genre: source.genre ?? "",
        targetAudience: source.targetAudience ?? "",
        logline: source.logline ?? "",
      };
      setStatus(nextSynopsis.status ?? "draft");
      setGenre(nextSynopsis.genre ?? "");
      setTargetAudience(nextSynopsis.targetAudience ?? "");
      setLogline(nextSynopsis.logline ?? "");
      synopsisRef.current = nextSynopsis;
      if (cache) synopsisByScopeRef.current.set(projectScope, nextSynopsis);
    };
    const scopeChanged = activeScopeRef.current !== projectScope;
    activeScopeRef.current = projectScope;
    const pendingAtLoadStart = pendingSynopsisSavesRef.current.find(
      (save) =>
        save.projectId === projectId &&
        save.projectPath === luieAttachmentPath,
    );
    if (scopeChanged) {
      const cachedSynopsis = synopsisByScopeRef.current.get(projectScope);
      const transitionSynopsis = pendingAtLoadStart?.data ?? cachedSynopsis;
      if (transitionSynopsis) {
        hydratedScopesRef.current.add(projectScope);
        setEditableScope(projectScope);
        applySynopsis(transitionSynopsis);
      } else {
        setEditableScope(null);
        applySynopsis({ synopsis: fallback, status: "draft" }, false);
      }
    }
    const loadGeneration = mutationGenerationByScopeRef.current.get(
      projectScope,
    );
    void flushSynopsisRef.current().catch(() => undefined);

    void (async () => {
      const loaded = await worldPackageStorage.loadSynopsis(
        projectId,
        luieAttachmentPath,
        fallback,
      );
      if (cancelled) return;
      if (
        mutationGenerationByScopeRef.current.get(projectScope) !==
        loadGeneration
      ) {
        return;
      }
      const pending = pendingSynopsisSavesRef.current.find(
        (save) =>
          save.projectId === projectId &&
          save.projectPath === luieAttachmentPath,
      );
      applySynopsis(pending?.data ?? pendingAtLoadStart?.data ?? loaded);
      hydratedScopesRef.current.add(projectScope);
      if (activeScopeRef.current === projectScope) {
        setEditableScope(projectScope);
      }
    })().catch((error: unknown) => {
      if (!cancelled) {
        void api.logger.warn("Failed to load synopsis project scope", {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
        showToast(t("research.toast.worldSaveFailed"), "error");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [projectId, luieAttachmentPath, projectScope, showToast, t]);

  const flushSynopsis = async (): Promise<void> => {
    const inFlight = saveInFlightRef.current;
    if (inFlight) {
      await inFlight;
      return flushSynopsisRef.current();
    }
    const snapshot = pendingSynopsisSavesRef.current[0];
    if (!snapshot) return;

    const save = worldPackageStorage
      .saveSynopsis(snapshot.projectId, snapshot.projectPath, snapshot.data)
      .catch((error: unknown) => {
        showToast(t("research.toast.worldSaveFailed"), "error");
        throw error;
      });
    saveInFlightRef.current = save;
    try {
      await save;
      if (pendingSynopsisSavesRef.current[0] === snapshot) {
        pendingSynopsisSavesRef.current.shift();
      }
    } finally {
      if (saveInFlightRef.current === save) saveInFlightRef.current = null;
    }
    return flushSynopsisRef.current();
  };

  useEffect(() => {
    flushSynopsisRef.current = flushSynopsis;
  });

  useEffect(
    () => registerSaveBufferFlush(() => flushSynopsisRef.current()),
    [],
  );

  useEffect(
    () => () => {
      if (
        pendingSynopsisSavesRef.current.length === 0 &&
        !saveInFlightRef.current
      ) {
        return;
      }
      preserveUnmountSave(flushSynopsisRef.current(), () =>
        flushSynopsisRef.current(),
      );
    },
    [],
  );

  const persistSynopsis = (
    overrides: Partial<WorldSynopsisData>,
  ): Promise<void> => {
    if (
      !projectId ||
      !projectScope ||
      !hydratedScopesRef.current.has(projectScope)
    ) {
      return Promise.resolve();
    }
    const data = {
      ...(synopsisByScopeRef.current.get(projectScope) ?? synopsisRef.current),
      ...overrides,
    };
    synopsisByScopeRef.current.set(projectScope, data);
    mutationGenerationByScopeRef.current.set(
      projectScope,
      (mutationGenerationByScopeRef.current.get(projectScope) ?? 0) + 1,
    );
    if (activeScopeRef.current === projectScope) synopsisRef.current = data;
    const pending: PendingSynopsisSave = {
      projectId,
      projectPath: luieAttachmentPath,
      data,
    };
    const pendingIndex = pendingSynopsisSavesRef.current.findIndex(
      (save) =>
        save.projectId === pending.projectId &&
        save.projectPath === pending.projectPath,
    );
    if (pendingIndex === -1) pendingSynopsisSavesRef.current.push(pending);
    else pendingSynopsisSavesRef.current[pendingIndex] = pending;
    return flushSynopsis();
  };

  if (!currentProject || !projectId) return null;

  return (
    <fieldset
      key={projectScope}
      disabled={editableScope !== projectScope}
      className="h-full min-w-0 m-0 p-0 border-0 flex flex-col bg-[#faf9f6]/50 dark:bg-zinc-900 overflow-hidden transition-colors duration-500"
    >
      <div
        className={cn(
          "flex items-center justify-between px-8 py-4 shrink-0 transition-opacity duration-300",
          isFocused ? "opacity-50 hover:opacity-100" : "opacity-100 z-10",
        )}
      >
        <div className="flex items-center gap-3">
          <FileText className="w-5 h-5 text-muted" />
          <h2 className="text-sm font-medium text-muted tracking-widest">
            {t("world.synopsis.title")}
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-surface border border-border rounded-full p-1 shadow-xs">
          {(["draft", "working", "locked"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                void persistSynopsis({ status: s }).catch(() => undefined);
              }}
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1.5 border-none",
                status === s
                  ? "bg-accent text-accent-fg shadow-sm"
                  : "text-subtle bg-transparent hover:text-fg hover:bg-surface-hover",
              )}
            >
              {s === "locked" && <Lock className="w-3 h-3" />}
              {s === "working" && <PenLine className="w-3 h-3" />}
              {s === "draft" && <Unlock className="w-3 h-3" />}
              {t(`world.synopsis.status.${s}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto relative group custom-scrollbar">
        <div className="max-w-3xl mx-auto px-12 py-16 min-h-full flex flex-col gap-12">
          <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-2 gap-12">
              <div className="group/field">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2 group-focus-within/field:text-accent transition-colors">
                  {t("world.synopsis.genre", "Genre")}
                </label>
                <BufferedInput
                  className="w-full bg-transparent border-b border-border/50 py-1 text-base font-serif text-fg placeholder:text-muted/20 focus:border-accent focus:outline-none transition-colors rounded-none"
                  placeholder={t(
                    "world.synopsis.genrePlaceholder",
                    "e.g. Dark Fantasy",
                  )}
                  value={genre}
                  onSave={(val) => {
                    setGenre(val);
                    return persistSynopsis({ genre: val });
                  }}
                />
              </div>
              <div className="group/field">
                <label className="block text-[10px] font-bold text-muted uppercase tracking-widest mb-2 group-focus-within/field:text-accent transition-colors">
                  {t("world.synopsis.audience", "Target Audience")}
                </label>
                <BufferedInput
                  className="w-full bg-transparent border-b border-border/50 py-1 text-base font-serif text-fg placeholder:text-muted/20 focus:border-accent focus:outline-none transition-colors rounded-none"
                  placeholder={t(
                    "world.synopsis.audiencePlaceholder",
                    "e.g. Young Adult",
                  )}
                  value={targetAudience}
                  onSave={(val) => {
                    setTargetAudience(val);
                    return persistSynopsis({ targetAudience: val });
                  }}
                />
              </div>
            </div>

            <div className="group/field">
              <label className="flex items-center gap-2 text-[10px] font-bold text-muted uppercase tracking-widest mb-3 group-focus-within/field:text-accent transition-colors">
                <Sparkles className="w-3 h-3" />{" "}
                {t("world.synopsis.logline", "Logline")}
              </label>
              <BufferedTextArea
                className="w-full bg-transparent border-none p-0 resize-none text-2xl font-serif italic text-fg placeholder:text-muted/10 leading-relaxed focus:outline-none"
                placeholder={t(
                  "world.synopsis.loglinePlaceholder",
                  "One sentence summary of your story...",
                )}
                value={logline}
                onSave={(val) => {
                  setLogline(val);
                  return persistSynopsis({ logline: val });
                }}
                rows={2}
              />
            </div>
          </div>

          <div className="w-16 h-1 bg-border/30 rounded-full mx-auto" />

          <div className="relative flex-1">
            <BufferedTextArea
              className={cn(
                "w-full h-full bg-transparent border-none outline-none resize-none transition-all placeholder:text-muted/10 focus:placeholder:text-muted/20",
                "text-lg leading-loose font-serif text-fg focus:ring-0",
                status === "locked" &&
                  "opacity-70 cursor-not-allowed select-none",
              )}
              style={{ boxShadow: "none" }}
              placeholder={t("world.synopsis.placeholder")}
              value={currentProject.description || ""}
              readOnly={status === "locked"}
              onSave={async (val) => {
                const [updated] = await Promise.all([
                  updateProject({ id: projectId, description: val }),
                  persistSynopsis({ synopsis: val }),
                ]);
                if (!updated)
                  throw new Error("Failed to save project synopsis");
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              spellCheck={false}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
