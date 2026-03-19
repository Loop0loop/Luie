export const buildGraphNodeDefaultName = (
  entityType: string,
  t: (key: string) => string,
): string => {
  switch (entityType) {
    case "Character":
      return t("research.graph.nodeDefaults.character");
    case "Event":
      return t("research.graph.nodeDefaults.event");
    case "Place":
      return t("research.graph.nodeDefaults.place");
    case "Concept":
      return t("research.graph.nodeDefaults.concept");
    default:
      return t("research.graph.nodeDefaults.entity");
  }
};
