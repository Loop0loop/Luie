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
  const normalizeName = (name: string): string =>
    name.trim().toLocaleLowerCase();

  const normalizedBaseName = normalizeName(baseName);
  const normalized = new Set(
    existingNames
      .map((name) => normalizeName(name))
      .filter((name) => name.length > 0),
  );

  if (!normalized.has(normalizedBaseName)) {
    return baseName;
  }

  let index = 1;
  while (normalized.has(normalizeName(`${baseName} ${index}`))) {
    index += 1;
  }

  return `${baseName} ${index}`;
};
