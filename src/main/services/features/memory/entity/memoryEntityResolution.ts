export function normalizeMemoryEntityName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function buildMemoryEntityAliasKey(input: {
  projectId: string;
  entityType: string;
  alias: string;
}): string {
  return [
    input.projectId,
    normalizeMemoryEntityName(input.entityType),
    normalizeMemoryEntityName(input.alias),
  ].join(":");
}
