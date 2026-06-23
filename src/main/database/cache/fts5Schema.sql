CREATE VIRTUAL TABLE IF NOT EXISTS "ChapterSearchDocumentFts"
USING fts5(
    "chapterId" UNINDEXED,
    "projectId" UNINDEXED,
    "title",
    "synopsis",
    "searchText",
    tokenize = 'unicode61'
);
