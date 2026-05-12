import type { GraphCreatePreset } from "../../types";

export const GRAPH_ENTITY_CREATE_PRESETS: GraphCreatePreset[] = [
  {
    entityType: "Character",
    label: "research.graph.presets.addCharacter",
  },
  { entityType: "Event", label: "research.graph.presets.addEvent" },
  {
    entityType: "Place",
    subType: "Place",
    label: "research.graph.presets.addPlace",
  },
  {
    entityType: "Concept",
    subType: "Concept",
    label: "research.graph.presets.addConcept",
  },
];
