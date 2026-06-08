export type RagEmbeddingProvider = (
  projectId: string,
  texts: string[],
) => Promise<ReadonlyArray<ArrayLike<number>> | null>;
