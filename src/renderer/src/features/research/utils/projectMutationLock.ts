export async function runWithProjectLock<T>(
  locks: Set<string>,
  projectId: string,
  task: () => Promise<T>,
): Promise<T | null> {
  if (locks.has(projectId)) {
    return null;
  }

  locks.add(projectId);
  try {
    return await task();
  } finally {
    locks.delete(projectId);
  }
}
