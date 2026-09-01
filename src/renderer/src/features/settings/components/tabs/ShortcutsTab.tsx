import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { RotateCcw, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ShortcutGroupMap } from "@renderer/features/settings/components/tabs/types";
import {
  findAcceleratorConflicts,
  normalizeShortcutKey,
  validateAccelerator,
  type AcceleratorRejection,
} from "@shared/utils/shortcutAccelerator";

const MODIFIER_KEYS = new Set(["Shift", "Control", "Alt", "Meta"]);

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.platform);

/** 기능키(f1~f24) 판정. WHY 모듈 상수인가: formatPart가 표시할 조각마다 호출된다. */
const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-9]|2[0-4])$/;

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
    case "plus":
      return "+";
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
      if (FUNCTION_KEY_PATTERN.test(part)) return part.toUpperCase();
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
  /** 이 행에서 기록이 거부된 이유. 기록 중일 때만 표시한다. */
  rejectedReason?: AcceleratorRejection | null;
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
  rejectedReason,
  t,
  onRecordStart,
  onClear,
  onBlur,
}: ShortcutRowProps) {
  const parts = useMemo(() => splitParts(value), [value]);

  return (
    <div className="flex flex-col py-1.5 px-2 rounded-control hover:bg-surface/50 transition-colors group">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted group-hover:text-fg transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRecordStart(actionId)}
            aria-label={label}
            className={`min-w-[8.5rem] inline-flex items-center justify-center rounded-control border px-2.5 py-1 text-xs transition-all focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring shadow-2xs ${
              isRecording
                ? "border-accent bg-accent/15 text-accent ring-1 ring-accent animate-pulse font-medium"
                : value
                  ? "border-border/60 bg-element/70 backdrop-blur-xs text-fg hover:border-accent hover:bg-surface"
                  : "border-dashed border-border/60 bg-element/40 backdrop-blur-xs text-subtle hover:border-accent hover:text-fg"
            } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
          >
            {isRecording ? (
              <span className="font-mono">{t("settings.shortcuts.recording")}</span>
            ) : parts.length > 0 ? (
              <span className="flex items-center justify-center gap-1">
                {parts.map((part, i) => (
                  <span key={`${part}-${i}`} className="flex items-center gap-1">
                    {i > 0 ? <span className="text-subtle text-[11px]">+</span> : null}
                    <kbd className="inline-flex items-center justify-center min-w-[18px] px-1.5 py-0.5 rounded-[5px] bg-surface/90 border border-border/80 font-sans text-xs font-semibold tabular-nums text-fg shadow-2xs">
                      {formatPart(part)}
                    </kbd>
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-subtle">{t("settings.shortcuts.empty")}</span>
            )}
          </button>
          {value && !isRecording ? (
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                onClear(actionId);
                onBlur();
              }}
              aria-label={t("settings.shortcuts.clear")}
              title={t("settings.shortcuts.clear")}
              className="p-1 text-subtle hover:text-danger rounded-control hover:bg-surface transition-colors focus:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {conflictWith && !isRecording ? (
        <p className="mt-1 text-[11px] text-warning">{t("settings.shortcuts.conflict")}</p>
      ) : null}
      {rejectedReason && isRecording ? (
        <p className="mt-1 text-[11px] text-warning" role="alert">
          {t("settings.shortcuts.needsModifier")}
        </p>
      ) : null}
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
  const [rejectedReason, setRejectedReason] = useState<AcceleratorRejection | null>(null);

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
        setRejectedReason(null);
        return;
      }
      if (MODIFIER_KEYS.has(e.key)) return;

      const parts: string[] = [];
      if (e.metaKey) parts.push("cmd");
      if (e.ctrlKey) parts.push("ctrl");
      if (e.altKey) parts.push("alt");
      if (e.shiftKey) parts.push("shift");
      parts.push(normalizeShortcutKey(e.key));

      const accelerator = parts.join("+");

      const validation = validateAccelerator(accelerator);
      if (!validation.ok) {
        setRejectedReason(validation.reason);
        return;
      }

      setRejectedReason(null);
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

  const conflictMap = useMemo(() => findAcceleratorConflicts(shortcutDrafts), [shortcutDrafts]);

  return (
    <div className="max-w-2xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-fg">{t("settings.shortcuts.title")}</h3>
          <p className="text-xs text-muted mt-0.5">
            {t("settings.shortcuts.description", "자주 사용하는 기능의 단축키를 사용자 지정합니다.")}
          </p>
        </div>
        <button
          type="button"
          onClick={onResetShortcuts}
          disabled={isSaving}
          className="flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs text-muted hover:bg-surface/80 hover:text-fg border border-transparent hover:border-border/60 transition-all shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RotateCcw className="h-3 w-3" />
          {t("settings.shortcuts.reset")}
        </button>
      </div>

      {/* Shortcut Groups Cards */}
      {Object.entries(shortcutGroups).map(([groupKey, actions]) => {
        const Icon = getShortcutGroupIcon(groupKey);
        return actions.length > 0 ? (
          <div
            key={groupKey}
            className="rounded-panel border border-border/70 bg-surface/60 backdrop-blur-md p-4 space-y-2 shadow-xs hover:border-border transition-all"
          >
            {/* Group Header */}
            <div className="flex items-center gap-2 text-muted pb-2 border-b border-border/60">
              <Icon className="w-4 h-4 text-accent" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-fg">
                {getShortcutGroupLabel(groupKey)}
              </h4>
            </div>

            {/* Actions List */}
            <div className="divide-y divide-border/30 pt-0.5">
              {actions.map((action) => (
                <ShortcutRow
                  key={action.id}
                  actionId={action.id}
                  label={t(action.labelKey)}
                  value={shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? ""}
                  disabled={isSaving}
                  isRecording={recordingId === action.id}
                  conflictWith={conflictMap.get(action.id)}
                  rejectedReason={recordingId === action.id ? rejectedReason : null}
                  t={t}
                  onRecordStart={(id) => {
                    setRecordingId(id);
                    setRejectedReason(null);
                  }}
                  onClear={handleClear}
                  onBlur={() => onCommitShortcuts(shortcutDraftsRef.current)}
                />
              ))}
            </div>
          </div>
        ) : null;
      })}
    </div>
  );
});
