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

export const buildNextCanvasBlockName = (
  existingNames: string[],
  baseName = "새로운 블럭",
): string => {
  const normalized = new Set(
    existingNames.map((name) => name.trim()).filter((name) => name.length > 0),
  );

  if (!normalized.has(baseName)) {
    return baseName;
  }

  let index = 1;
  while (normalized.has(`${baseName} ${index}`)) {
    index += 1;
  }

  return `${baseName} ${index}`;
};
