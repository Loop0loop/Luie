import { useCharacterStore } from "@renderer/features/research/stores/characterStore";
import { useEventStore } from "@renderer/features/research/stores/eventStore";
import { useFactionStore } from "@renderer/features/research/stores/factionStore";
import type { CanvasEntityPreview } from "../../../types";
import type { EntityKind } from "./canvasDocumentModel";

export function useCanvasEntity(preview: Extract<CanvasEntityPreview, { kind: EntityKind }>) {
  const character = useCharacterStore((state) =>
    preview.kind === "character"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const event = useEventStore((state) =>
    preview.kind === "event"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const faction = useFactionStore((state) =>
    preview.kind === "faction"
      ? state.currentItem?.id === preview.id
        ? state.currentItem
        : (state.items.find((item) => item.id === preview.id) ?? null)
      : null,
  );
  const characterIsLoading = useCharacterStore((state) => state.isLoading);
  const loadCharacter = useCharacterStore((state) => state.loadCharacter);
  const updateCharacter = useCharacterStore((state) => state.updateCharacter);
  const eventIsLoading = useEventStore((state) => state.isLoading);
  const loadEvent = useEventStore((state) => state.loadEvent);
  const updateEvent = useEventStore((state) => state.updateEvent);
  const factionIsLoading = useFactionStore((state) => state.isLoading);
  const loadFaction = useFactionStore((state) => state.loadFaction);
  const updateFaction = useFactionStore((state) => state.updateFaction);

  if (preview.kind === "character") {
    return {
      entity: character,
      isLoading: characterIsLoading,
      load: loadCharacter,
      update: updateCharacter,
    };
  }
  if (preview.kind === "event") {
    return {
      entity: event,
      isLoading: eventIsLoading,
      load: loadEvent,
      update: updateEvent,
    };
  }
  return {
    entity: faction,
    isLoading: factionIsLoading,
    load: loadFaction,
    update: updateFaction,
  };
}
