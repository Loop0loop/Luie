import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import type { LucideIcon } from "lucide-react";
import type { ShortcutGroupMap } from "@renderer/features/settings/components/tabs/types";

const areShortcutMapsEqual = (
    left: Record<string, string>,
    right: Record<string, string>,
): boolean => {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);

    if (leftKeys.length !== rightKeys.length) {
        return false;
    }

    for (const key of leftKeys) {
        if (!Object.prototype.hasOwnProperty.call(right, key)) {
            return false;
        }
        if (left[key] !== right[key]) {
            return false;
        }
    }

    return true;
};

interface ShortcutRowProps {
    actionId: string;
    label: string;
    value: string;
    placeholder: string;
    disabled?: boolean;
    onChangeAction: (actionId: string, value: string) => void;
    onBlur: () => void;
}

const ShortcutRow = memo(function ShortcutRow({
    actionId,
    label,
    value,
    placeholder,
    disabled = false,
    onChangeAction,
    onBlur,
}: ShortcutRowProps) {
    return (
        <div className="flex items-center justify-between py-2 group">
            <div className="text-sm text-muted group-hover:text-fg transition-colors">{label}</div>
            <div className="relative w-40">
                <input
                    className="w-full bg-surface border border-border rounded-md px-3 py-1.5 text-sm font-mono text-fg focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-colors text-center"
                    value={value}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={(e) => onChangeAction(actionId, e.target.value)}
                    onBlur={onBlur}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                        }
                    }}
                />
            </div>
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

    useEffect(() => {
        if (areShortcutMapsEqual(shortcutDraftsRef.current, shortcutValues)) {
            return;
        }
        const syncTimer = window.setTimeout(() => {
            setShortcutDrafts(shortcutValues);
            shortcutDraftsRef.current = shortcutValues;
        }, 0);
        return () => window.clearTimeout(syncTimer);
    }, [shortcutValues]);

    const handleShortcutDraftChange = useCallback((actionId: string, value: string) => {
        setShortcutDrafts((prev) => {
            if (prev[actionId] === value) {
                return prev;
            }
            const next = { ...prev, [actionId]: value };
            shortcutDraftsRef.current = next;
            return next;
        });
    }, []);

    const handleCommitShortcuts = useCallback(() => {
        onCommitShortcuts(shortcutDraftsRef.current);
    }, [onCommitShortcuts]);

    return (
        <div className="max-w-2xl space-y-8 pb-20 content-visibility-auto contain-intrinsic-size-[1px_1400px]">
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
                                <h4 className="text-sm font-semibold uppercase tracking-wider">{getShortcutGroupLabel(groupKey)}</h4>
                            </div>
                            <div className="space-y-1">
                                {actions.map((action) => (
                                    <ShortcutRow
                                        key={action.id}
                                        actionId={action.id}
                                        label={t(action.labelKey)}
                                        value={shortcutDrafts[action.id] ?? shortcutDefaults[action.id] ?? ""}
                                        placeholder={shortcutDefaults[action.id] ?? ""}
                                        disabled={isSaving}
                                        onChangeAction={handleShortcutDraftChange}
                                        onBlur={handleCommitShortcuts}
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
