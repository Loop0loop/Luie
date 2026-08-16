import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShortcutGroupMap } from "@renderer/features/settings/components/tabs/types";

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const formatPart = (part: string): string => {
  switch (part) {
    case "cmd":
    case "command":
      return isMac ? "⌘" : "Cmd";
    case "ctrl":
    case "control":
      return isMac ? "⌃" : "Ctrl";
    case "shift":
      return isMac ? "⇧" : "Shift";
    case "alt":
    case "option":
      return isMac ? "⌥" : "Alt";
    case "space":
      return "Space";
    case "comma":
      return ",";
    case "arrowup":
      return "↑";
    case "arrowdown":
      return "↓";
    case "arrowleft":
      return "←";
    case "arrowright":
      return "→";
    case "enter":
      return "↵";
    case "escape":
      return "Esc";
    case "backspace":
      return "⌫";
    case "tab":
      return "⇥";
    default:
      return part.length === 1 ? part.toUpperCase() : part;
  }
};

const splitParts = (accelerator: string): string[] =>
  accelerator
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean);

const areShortcutMapsEqual = (
  left: Record<string, string>,
  right: Record<string, string>,
): boolean => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  for (const key of leftKeys) {
    if (!Object.prototype.hasOwnProperty.call(right, key)) return false;
    if (left[key] !== right[key]) return false;
  }
  return true;
};

interface ShortcutRowProps {
  actionId: string;
  label: string;
  value: string;
  disabled?: boolean;
  isRecording: boolean;
  conflictWith?: string;
  t: TFunction;
  onRecordStart: (actionId: string) => void;
  onClear: (actionId: string) => void;
  onBlur: () => void;
}

const ShortcutRow = memo(function ShortcutRow({
  actionId,
  label,
  value,
  disabled = false,
  isRecording,
  conflictWith,
  t,
  onRecordStart,
  onClear,
  onBlur,
}: ShortcutRowProps) {
  const parts = useMemo(() => splitParts(value), [value]);

  return (
    <div className="py-2 group">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-muted group-hover:text-fg transition-colors">
          {label}
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRecordStart(actionId)}
            aria-label={label}
            className={`min-w-[8.5rem] rounded-control border px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
              isRecording
                ? "border-accent bg-accent/10 text-accent animate-pulse"
                : value
                  ? "border-border bg-surface text-fg hover:border-accent"
                  : "border-dashed border-border bg-surface text-subtle hover:border-accent hover:text-fg"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isRecording ? (
              <span className="font-mono">{t("settings.shortcuts.recording")}</span>
            ) : parts.length > 0 ? (
              <span className="flex items-center justify-center gap-1">
                {parts.map((part, i) => (
                  <span key={`${part}-${i}`} className="flex items-center gap-1">
                    {i > 0 && <span className="text-subtle">+</span>}
                    <kbd className="font-sans font-semibold tabular-nums">
                      {formatPart(part)}
                    </kbd>
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-subtle">{t("settings.shortcuts.empty")}</span>
            )}
          </button>
          {value && !isRecording && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onClear(actionId);
                onBlur();
              }}
              aria-label={t("settings.shortcuts.clear")}
              title={t("settings.shortcuts.clear")}
              className="p-1 text-subtle hover:text-danger rounded-control transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {conflictWith && !isRecording && (
        <p className="mt-1 text-[11px] text-warning">{t("settings.shortcuts.conflict")}</p>
      )}
    </div>
  );
});

interface ShortcutsTabProps {
  t: TFunction;
  shortcutGroups: ShortcutGroupMap;
  shortcutValues: Record<string, string>;
  shortcutDefaults: Record<string, string>;
  isSaving: boolean;
  onCommitShortcuts: (nextDrafts: Record<string, string>) => void;
  onResetShortcuts: () => void;
  getShortcutGroupLabel: (key: string) => string;
  getShortcutGroupIcon: (key: string) => LucideIcon;
}

export const ShortcutsTab = memo(function ShortcutsTab({
  t,
  shortcutGroups,
  shortcutValues,
  shortcutDefaults,
  isSaving,
  onCommitShortcuts,
  onResetShortcuts,
  getShortcutGroupLabel,
  getShortcutGroupIcon,
}: ShortcutsTabProps) {
  const [shortcutDrafts, setShortcutDrafts] = useState<Record<string, string>>(shortcutValues);
  const shortcutDraftsRef = useRef<Record<string, string>>(shortcutValues);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  useEffect(() => {
    if (areShortcutMapsEqual(shortcutDraftsRef.current, shortcutValues)) return;
    const syncTimer = window.setTimeout(() => {
      setShortcutDrafts(shortcutValues);
      shortcutDraftsRef.current = shortcutValues;
    }, 0);
    return () => window.clearTimeout(syncTimer);
  }, [shortcutValues]);

  useEffect(() => {
    if (!recordingId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === "Escape") {
        setRecordingId(null);
        return;
      }
      if (MODIFIER_KEYS.has(e.key)) return;

      const parts: string[] = [];
      if (e.metaKey) parts.push("cmd");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      let key = e.key;
      if (key === " ") key = "space";
      else if (key === ",") key = "comma";
      parts.push(key.toLowerCase());

      const accelerator = parts.join("+");
      setShortcutDrafts((prev) => {
        const next = { ...prev, [recordingId]: accelerator };
        shortcutDraftsRef.current = next;
        return next;
      });
      setRecordingId(null);
      onCommitShortcuts({ ...shortcutDraftsRef.current, [recordingId]: accelerator });
    };
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [recordingId, onCommitShortcuts]);

  const handleClear = useCallback((actionId: string) => {
    setShortcutDrafts((prev) => {
      const next = { ...prev, [actionId]: "" };
      shortcutDraftsRef.current = next;
      return next;
    });
  }, []);

  const conflictMap = useMemo(() => {
    const map = new Map<string, string>();
    const entries = Object.entries(shortcutDrafts).filter(([, v]) => v);
    for (let i = 0; i < entries.length; i++) {
      const [idA, valA] = entries[i];
      for (let j = i + 1; j < entries.length; j++) {
        const [idB, valB] = entries[j];
        if (valA === valB) {
          map.set(idA, idB);
          map.set(idB, idA);
        }
      }
    }
    return map;
  }, [shortcutDrafts]);

  return (
    <div className="max-w-2xl space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-fg">{t("settings.shortcuts.title")}</h3>
        <button
          onClick={onResetShortcuts}
          disabled={isSaving}
            className="text-xs text-subtle hover:text-fg underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t("settings.shortcuts.reset")}
        </button>
      </div>

      {Object.entries(shortcutGroups).map(([groupKey, actions]) => {
        const Icon = getShortcutGroupIcon(groupKey);
        return (
          actions.length > 0 && (
            <div key={groupKey} className="space-y-3">
              <div className="flex items-center gap-2 text-muted pb-1 border-b border-border/50">
                <Icon className="w-4 h-4" />
                <h4 className="text-sm font-semibold uppercase tracking-wider">
                  {getShortcutGroupLabel(groupKey)}
                </h4>
              </div>
              <div className="space-y-1">
                {actions.map((action) => (
                  <ShortcutRow
                    key={action.id}
                    actionId={action.id}
                    label={t(action.labelKey)}
                    value={shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? ""}
                    disabled={isSaving}
                    isRecording={recordingId === action.id}
                    conflictWith={conflictMap.get(action.id)}
                    t={t}
                    onRecordStart={(id) => setRecordingId(id)}
                    onClear={handleClear}
                    onBlur={() => onCommitShortcuts(shortcutDraftsRef.current)}
                  />
                ))}
              </div>
            </div>
          )
        );
      })}
    </div>
  );
});
