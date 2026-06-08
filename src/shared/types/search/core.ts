export interface SearchQuery {
  projectId: string;
  query: string;
  type?: "all" | "character" | "term";
}

export interface SearchResult {
  type: "character" | "term" | "chapter";
  id: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
}
