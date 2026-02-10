import { useEffect } from "react";
import type { ShortcutAction, ShortcutMap } from "../../../shared/types";
import { useShortcutStore } from "../stores/shortcutStore";

export type ShortcutHandlers = Partial<Record<ShortcutAction, () => void>>;

const MODIFIER_KEYS = new Set(["cmd", "command", "ctrl", "control", "shift", "alt", "option"]);

const normalizeKey = (key: string): string => {
  if (key === ",") return "comma";
  if (key === " ") return "space";
  return key.toLowerCase();
};

const parseAccelerator = (accelerator: string) => {
  const parts = accelerator
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.toLowerCase());

  const modifiers = new Set<string>();
  let key = "";

  for (const part of parts) {
    if (MODIFIER_KEYS.has(part)) {
      modifiers.add(part);
    } else {
      key = part;
    }
  }

  return { key, modifiers };
};

const matchShortcut = (event: KeyboardEvent, accelerator: string): boolean => {
  if (!accelerator) return false;
  const { key, modifiers } = parseAccelerator(accelerator);
  if (!key) return false;

  const wantsCmd = modifiers.has("cmd") || modifiers.has("command");
  const wantsCtrl = modifiers.has("ctrl") || modifiers.has("control");
  const wantsShift = modifiers.has("shift");
  const wantsAlt = modifiers.has("alt") || modifiers.has("option");

  if (wantsCmd !== event.metaKey) return false;
  if (wantsCtrl !== event.ctrlKey) return false;
  if (wantsShift !== event.shiftKey) return false;
  if (wantsAlt !== event.altKey) return false;

  return normalizeKey(event.key) === normalizeKey(key);
};

const isEditableTarget = (event: KeyboardEvent): boolean => {
  const target = event.target as HTMLElement | null;
  if (!target) return false;
  const tagName = target.tagName?.toLowerCase();
  if (tagName === "input" || tagName === "textarea" || tagName === "select") return true;
  return Boolean(target.isContentEditable);
};

const ALLOW_IN_EDITORS = new Set<ShortcutAction>(["chapter.save"]);

export function useShortcuts(handlers: ShortcutHandlers, enabled: boolean = true): void {
  const shortcuts = useShortcutStore((state) => state.shortcuts) as ShortcutMap;

  useEffect(() => {
    if (!enabled) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const entries = Object.entries(shortcuts) as Array<[ShortcutAction, string]>;
      for (const [action, accelerator] of entries) {
        if (!handlers[action]) continue;
        if (isEditableTarget(event) && !ALLOW_IN_EDITORS.has(action)) continue;
        if (matchShortcut(event, accelerator)) {
          event.preventDefault();
          handlers[action]?.();
          break;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers, shortcuts, enabled]);
}
