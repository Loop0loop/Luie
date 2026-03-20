type NodePositionCommitInput = {
  id: string;
  x: number;
  y: number;
};

type PersistAutoLayoutNodePositionsInput = {
  updates: NodePositionCommitInput[];
  onNodePositionCommit?: (input: NodePositionCommitInput) => void;
  onError?: (error: unknown) => void;
};

export async function persistAutoLayoutNodePositions({
  updates,
  onNodePositionCommit,
  onError,
}: PersistAutoLayoutNodePositionsInput): Promise<void> {
  if (!onNodePositionCommit || updates.length === 0) {
    return;
  }

  try {
    await Promise.all(
      updates.map(({ id, x, y }) =>
        Promise.resolve().then(() => onNodePositionCommit({ id, x, y })),
      ),
    );
  } catch (error) {
    onError?.(error);
  }
}
