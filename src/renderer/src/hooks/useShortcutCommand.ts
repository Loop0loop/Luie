import { useEffect } from "react";

export type ShortcutCommand =
  | { type: "character.openTemplate" }
  | { type: "world.addTerm" }
  | { type: "scrap.addMemo" }
  | { type: "sidebar.section.toggle"; section: "manuscript" | "research" | "snapshot" | "trash" }
  | { type: "sidebar.section.open"; section: "manuscript" | "research" | "snapshot" | "trash" }
  | { type: "sidebar.section.close"; section: "manuscript" | "research" | "snapshot" | "trash" };

const shortcutCommandTarget = new EventTarget();

export function emitShortcutCommand(command: ShortcutCommand): void {
  shortcutCommandTarget.dispatchEvent(
    new CustomEvent("shortcut-command", { detail: command }),
  );
}

export function useShortcutCommand(
  handler: (command: ShortcutCommand) => void,
): void {
  useEffect(() => {
    const listener = (event: Event) => {
      handler((event as CustomEvent<ShortcutCommand>).detail);
    };
    shortcutCommandTarget.addEventListener("shortcut-command", listener);
    return () => {
      shortcutCommandTarget.removeEventListener("shortcut-command", listener);
    };
  }, [handler]);
}
