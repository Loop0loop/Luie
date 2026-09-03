CREATE TABLE `Project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`projectPath` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ProjectAttachment` (
	`projectId` text PRIMARY KEY NOT NULL,
	`projectPath` text,
	`exportedRevision` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ProjectAttachment_projectPath_key` ON `ProjectAttachment` (`projectPath`);--> statement-breakpoint
CREATE TABLE `ProjectLocalState` (
	`projectId` text PRIMARY KEY NOT NULL,
	`lastOpenedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ProjectLocalState_lastOpenedAt_idx` ON `ProjectLocalState` (`lastOpenedAt`);--> statement-breakpoint
CREATE TABLE `ProjectSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`autoSave` integer DEFAULT 1 NOT NULL,
	`autoSaveInterval` integer DEFAULT 30 NOT NULL,
	`llmModelPath` text,
	`llmEmbeddingModelPath` text,
	`llmEmbeddingDimension` integer DEFAULT 1024 NOT NULL,
	`llmProviderHint` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ProjectSettings_projectId_key` ON `ProjectSettings` (`projectId`);--> statement-breakpoint
CREATE TABLE `Chapter` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`synopsis` text,
	`order` integer NOT NULL,
	`wordCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Chapter_projectId_order_idx` ON `Chapter` (`projectId`,`order`);--> statement-breakpoint
CREATE TABLE `ChapterBody` (
	`chapterId` text PRIMARY KEY NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`contentHash` text DEFAULT '' NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `ChapterRevision` (
	`id` text PRIMARY KEY NOT NULL,
	`chapterId` text NOT NULL,
	`contentHash` text NOT NULL,
	`content` text NOT NULL,
	`reason` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ChapterRevision_chapterId_createdAt_idx` ON `ChapterRevision` (`chapterId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Note` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Note_projectId_updatedAt_idx` ON `Note` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `Plot` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Plot_projectId_updatedAt_idx` ON `Plot` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `Scene` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`startOffset` integer,
	`endOffset` integer,
	`order` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Scene_projectId_chapterId_order_idx` ON `Scene` (`projectId`,`chapterId`,`order`);--> statement-breakpoint
CREATE TABLE `Synopsis` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `Synopsis_projectId_updatedAt_idx` ON `Synopsis` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `SearchDirtyQueue` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` text NOT NULL,
	`reason` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `SearchDirtyQueue_projectId_status_idx` ON `SearchDirtyQueue` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `SearchDirtyQueue_source_idx` ON `SearchDirtyQueue` (`sourceType`,`sourceId`);--> statement-breakpoint
CREATE TABLE `ChapterSummary` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text NOT NULL,
	`chapterNumber` integer DEFAULT 0 NOT NULL,
	`summary` text NOT NULL,
	`contentHash` text DEFAULT '' NOT NULL,
	`isFallback` integer DEFAULT false NOT NULL,
	`model` text,
	`generatedAt` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ChapterSummary_chapterId_key` ON `ChapterSummary` (`chapterId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ChapterSummary_id_projectId_key` ON `ChapterSummary` (`id`,`projectId`);--> statement-breakpoint
CREATE INDEX `ChapterSummary_projectId_idx` ON `ChapterSummary` (`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryBuildJob` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`targetType` text NOT NULL,
	`targetId` text NOT NULL,
	`jobType` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryBuildJob_projectId_status_priority_idx` ON `MemoryBuildJob` (`projectId`,`status`,`priority`);--> statement-breakpoint
CREATE INDEX `MemoryBuildJob_target_idx` ON `MemoryBuildJob` (`targetType`,`targetId`);--> statement-breakpoint
CREATE TABLE `MemoryChunk` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` text NOT NULL,
	`chapterId` text,
	`sceneId` text,
	`chunkIndex` integer NOT NULL,
	`content` text NOT NULL,
	`contentHash` text NOT NULL,
	`indexText` text DEFAULT '' NOT NULL,
	`indexTextHash` text DEFAULT '' NOT NULL,
	`contextLabel` text,
	`sourceContentHash` text DEFAULT '' NOT NULL,
	`startOffset` integer,
	`endOffset` integer,
	`paragraphStartIndex` integer DEFAULT 0 NOT NULL,
	`paragraphEndIndex` integer DEFAULT 0 NOT NULL,
	`tokenCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_source_idx` ON `MemoryChunk` (`projectId`,`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_chapterId_idx` ON `MemoryChunk` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_sceneId_idx` ON `MemoryChunk` (`projectId`,`sceneId`);--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_source_paragraph_idx` ON `MemoryChunk` (`projectId`,`sourceType`,`sourceId`,`paragraphStartIndex`,`paragraphEndIndex`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryChunk_id_projectId_key` ON `MemoryChunk` (`id`,`projectId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryChunk_source_chunkIndex_key` ON `MemoryChunk` (`sourceType`,`sourceId`,`chunkIndex`);--> statement-breakpoint
CREATE TABLE `MemoryEmbedding` (
	`id` text PRIMARY KEY NOT NULL,
	`chunkId` text NOT NULL,
	`projectId` text NOT NULL,
	`contentHash` text DEFAULT '' NOT NULL,
	`vec` blob NOT NULL,
	`dimension` integer NOT NULL,
	`model` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`chunkId`) REFERENCES `MemoryChunk`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEmbedding_chunkId_key` ON `MemoryEmbedding` (`chunkId`);--> statement-breakpoint
CREATE INDEX `MemoryEmbedding_projectId_idx` ON `MemoryEmbedding` (`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryEpisode` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` text NOT NULL,
	`chapterId` text,
	`sceneId` text,
	`sourceContentHash` text NOT NULL,
	`extractorVersion` text NOT NULL,
	`episodeType` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`sceneId`) REFERENCES `Scene`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEpisode_projectId_source_idx` ON `MemoryEpisode` (`projectId`,`sourceType`,`sourceId`);--> statement-breakpoint
CREATE INDEX `MemoryEpisode_projectId_status_idx` ON `MemoryEpisode` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `MemoryEpisode_projectId_chapterId_idx` ON `MemoryEpisode` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEpisode_id_projectId_key` ON `MemoryEpisode` (`id`,`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryEpisodeEvidence` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`episodeId` text NOT NULL,
	`chapterId` text,
	`chunkId` text,
	`contentHash` text NOT NULL,
	`sourceContentHash` text NOT NULL,
	`startOffset` integer,
	`endOffset` integer,
	`quote` text NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`reviewStatus` text DEFAULT 'pending' NOT NULL,
	`reviewerNote` text,
	`reviewedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`episodeId`) REFERENCES `MemoryEpisode`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEpisodeEvidence_episodeId_idx` ON `MemoryEpisodeEvidence` (`episodeId`);--> statement-breakpoint
CREATE INDEX `MemoryEpisodeEvidence_projectId_chapterId_idx` ON `MemoryEpisodeEvidence` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEpisodeEvidence_id_projectId_key` ON `MemoryEpisodeEvidence` (`id`,`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryEpisodeExtractionJob` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` text NOT NULL,
	`sourceContentHash` text NOT NULL,
	`extractorVersion` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` integer DEFAULT 50 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`error` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEpisodeExtractionJob_projectId_status_priority_idx` ON `MemoryEpisodeExtractionJob` (`projectId`,`status`,`priority`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEpisodeExtractionJob_source_version_key` ON `MemoryEpisodeExtractionJob` (`projectId`,`sourceType`,`sourceId`,`sourceContentHash`,`extractorVersion`);--> statement-breakpoint
CREATE TABLE `MemoryEpisodeParticipant` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`episodeId` text NOT NULL,
	`entityId` text,
	`surfaceName` text NOT NULL,
	`role` text DEFAULT 'mentioned' NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`episodeId`) REFERENCES `MemoryEpisode`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEpisodeParticipant_episodeId_idx` ON `MemoryEpisodeParticipant` (`episodeId`);--> statement-breakpoint
CREATE TABLE `MemoryStateChangeCandidate` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`episodeId` text NOT NULL,
	`evidenceId` text NOT NULL,
	`subjectEntityId` text,
	`stateType` text NOT NULL,
	`beforeValue` text,
	`afterValue` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`episodeId`) REFERENCES `MemoryEpisode`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`evidenceId`) REFERENCES `MemoryEpisodeEvidence`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`subjectEntityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryStateChangeCandidate_episodeId_idx` ON `MemoryStateChangeCandidate` (`episodeId`);--> statement-breakpoint
CREATE INDEX `MemoryStateChangeCandidate_projectId_status_idx` ON `MemoryStateChangeCandidate` (`projectId`,`status`);--> statement-breakpoint
CREATE TABLE `MemoryEvalCase` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`question` text NOT NULL,
	`caseType` text DEFAULT 'qa' NOT NULL,
	`expectedAnswer` text,
	`temporalScopeStartChapterId` text,
	`temporalScopeEndChapterId` text,
	`queryChapterOrder` integer,
	`severity` text DEFAULT 'p1' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalCase_projectId_caseType_idx` ON `MemoryEvalCase` (`projectId`,`caseType`);--> statement-breakpoint
CREATE INDEX `MemoryEvalCase_projectId_severity_idx` ON `MemoryEvalCase` (`projectId`,`severity`);--> statement-breakpoint
CREATE TABLE `MemoryEvalEntity` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`entityType` text NOT NULL,
	`expectedAttributes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `MemoryEvalCase`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalEntity_caseId_idx` ON `MemoryEvalEntity` (`caseId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalEntity_projectId_name_idx` ON `MemoryEvalEntity` (`projectId`,`name`);--> statement-breakpoint
CREATE TABLE `MemoryEvalEvidence` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text,
	`expectedChunkId` text,
	`startOffset` integer,
	`endOffset` integer,
	`quote` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `MemoryEvalCase`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalEvidence_caseId_idx` ON `MemoryEvalEvidence` (`caseId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalEvidence_projectId_chapterId_idx` ON `MemoryEvalEvidence` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE TABLE `MemoryEvalFeedback` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`runId` text,
	`caseId` text,
	`resultId` text,
	`feedbackKind` text NOT NULL,
	`question` text NOT NULL,
	`answer` text,
	`evidenceJson` text DEFAULT '[]' NOT NULL,
	`note` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalFeedback_projectId_status_idx` ON `MemoryEvalFeedback` (`projectId`,`status`);--> statement-breakpoint
CREATE INDEX `MemoryEvalFeedback_projectId_kind_idx` ON `MemoryEvalFeedback` (`projectId`,`feedbackKind`);--> statement-breakpoint
CREATE INDEX `MemoryEvalFeedback_caseId_idx` ON `MemoryEvalFeedback` (`caseId`);--> statement-breakpoint
CREATE TABLE `MemoryEvalRelation` (
	`id` text PRIMARY KEY NOT NULL,
	`caseId` text NOT NULL,
	`projectId` text NOT NULL,
	`sourceName` text NOT NULL,
	`targetName` text NOT NULL,
	`relation` text NOT NULL,
	`temporalScope` text,
	`expectedAttributes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`caseId`) REFERENCES `MemoryEvalCase`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalRelation_caseId_idx` ON `MemoryEvalRelation` (`caseId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalRelation_projectId_relation_idx` ON `MemoryEvalRelation` (`projectId`,`relation`);--> statement-breakpoint
CREATE TABLE `MemoryEvalResult` (
	`id` text PRIMARY KEY NOT NULL,
	`runId` text NOT NULL,
	`caseId` text NOT NULL,
	`projectId` text NOT NULL,
	`groundingStatus` text NOT NULL,
	`evidenceHitCount` integer DEFAULT 0 NOT NULL,
	`evidenceMissCount` integer DEFAULT 0 NOT NULL,
	`contextRecallAtK` real DEFAULT 0 NOT NULL,
	`p0FailureCount` integer DEFAULT 0 NOT NULL,
	`p0Failures` text DEFAULT '[]' NOT NULL,
	`answer` text,
	`answerJudgeJson` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`runId`) REFERENCES `MemoryEvalRun`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`caseId`) REFERENCES `MemoryEvalCase`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_runId_idx` ON `MemoryEvalResult` (`runId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_caseId_idx` ON `MemoryEvalResult` (`caseId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_projectId_p0_idx` ON `MemoryEvalResult` (`projectId`,`p0FailureCount`);--> statement-breakpoint
CREATE TABLE `MemoryEvalRun` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`label` text NOT NULL,
	`engineVersion` text NOT NULL,
	`status` text DEFAULT 'running' NOT NULL,
	`startedAt` text NOT NULL,
	`completedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalRun_projectId_startedAt_idx` ON `MemoryEvalRun` (`projectId`,`startedAt`);--> statement-breakpoint
CREATE INDEX `MemoryEvalRun_projectId_status_idx` ON `MemoryEvalRun` (`projectId`,`status`);--> statement-breakpoint
CREATE TABLE `MemoryWriterTaskBenchmarkRun` (
	`id` text PRIMARY KEY NOT NULL,
	`runId` text NOT NULL,
	`projectId` text NOT NULL,
	`schemaVersion` integer DEFAULT 1 NOT NULL,
	`taskCount` integer DEFAULT 0 NOT NULL,
	`caseCount` integer DEFAULT 0 NOT NULL,
	`successRate` real DEFAULT 0 NOT NULL,
	`averageResponseTimeMs` real,
	`evidenceSatisfactionRate` real DEFAULT 0 NOT NULL,
	`falseConfidenceRate` real DEFAULT 0 NOT NULL,
	`p0FailureCount` integer DEFAULT 0 NOT NULL,
	`summaryJson` text DEFAULT '{}' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`runId`) REFERENCES `MemoryEvalRun`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryWriterTaskBenchmarkRun_runId_idx` ON `MemoryWriterTaskBenchmarkRun` (`runId`);--> statement-breakpoint
CREATE INDEX `MemoryWriterTaskBenchmarkRun_projectId_updatedAt_idx` ON `MemoryWriterTaskBenchmarkRun` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `MemoryEntity` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`entityType` text NOT NULL,
	`canonicalName` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`createdBy` text DEFAULT 'system' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEntity_projectId_type_idx` ON `MemoryEntity` (`projectId`,`entityType`);--> statement-breakpoint
CREATE INDEX `MemoryEntity_projectId_status_idx` ON `MemoryEntity` (`projectId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEntity_id_projectId_key` ON `MemoryEntity` (`id`,`projectId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEntity_projectId_type_name_key` ON `MemoryEntity` (`projectId`,`entityType`,`canonicalName`);--> statement-breakpoint
CREATE TABLE `MemoryEntityAlias` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`entityId` text NOT NULL,
	`entityType` text NOT NULL,
	`alias` text NOT NULL,
	`normalizedAlias` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEntityAlias_entityId_idx` ON `MemoryEntityAlias` (`entityId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEntityAlias_projectId_alias_key` ON `MemoryEntityAlias` (`projectId`,`entityType`,`normalizedAlias`);--> statement-breakpoint
CREATE TABLE `MemoryEntityMention` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`entityId` text NOT NULL,
	`aliasId` text,
	`chapterId` text,
	`chunkId` text,
	`contentHash` text DEFAULT '' NOT NULL,
	`sourceContentHash` text DEFAULT '' NOT NULL,
	`startOffset` integer,
	`endOffset` integer,
	`quote` text NOT NULL,
	`extractorVersion` text DEFAULT 'manual' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`reviewStatus` text DEFAULT 'pending' NOT NULL,
	`reviewerNote` text,
	`reviewedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`aliasId`) REFERENCES `MemoryEntityAlias`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEntityMention_entityId_idx` ON `MemoryEntityMention` (`entityId`);--> statement-breakpoint
CREATE INDEX `MemoryEntityMention_projectId_chapterId_idx` ON `MemoryEntityMention` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE TABLE `MemoryEntityMergeAudit` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceEntityId` text NOT NULL,
	`targetEntityId` text NOT NULL,
	`aliasId` text,
	`action` text NOT NULL,
	`reason` text,
	`createdBy` text DEFAULT 'user' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`sourceEntityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`targetEntityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`aliasId`) REFERENCES `MemoryEntityAlias`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEntityMergeAudit_projectId_source_idx` ON `MemoryEntityMergeAudit` (`projectId`,`sourceEntityId`);--> statement-breakpoint
CREATE INDEX `MemoryEntityMergeAudit_projectId_target_idx` ON `MemoryEntityMergeAudit` (`projectId`,`targetEntityId`);--> statement-breakpoint
CREATE TABLE `MemoryCharacterState` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`factId` text NOT NULL,
	`entityId` text NOT NULL,
	`stateType` text NOT NULL,
	`stateValue` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`factId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryCharacterState_projectId_stateType_idx` ON `MemoryCharacterState` (`projectId`,`stateType`);--> statement-breakpoint
CREATE TABLE `MemoryFact` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`subjectEntityId` text NOT NULL,
	`predicate` text NOT NULL,
	`objectEntityId` text,
	`objectValue` text,
	`valueType` text NOT NULL,
	`validFromChapterId` text NOT NULL,
	`validFromChapterOrder` integer NOT NULL,
	`validToChapterId` text,
	`validToChapterOrder` integer,
	`observedAtChapterId` text NOT NULL,
	`observedAtChapterOrder` integer NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`provenanceKind` text DEFAULT 'unknown' NOT NULL,
	`canonStatus` text DEFAULT 'unknown' NOT NULL,
	`extractorVersion` text NOT NULL,
	`sourceContentHash` text NOT NULL,
	`invalidatedByFactId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`subjectEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`objectEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE restrict,
	FOREIGN KEY (`validFromChapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`validToChapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`observedAtChapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`invalidatedByFactId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryFact_projectId_subject_predicate_idx` ON `MemoryFact` (`projectId`,`subjectEntityId`,`predicate`);--> statement-breakpoint
CREATE INDEX `MemoryFact_projectId_validity_idx` ON `MemoryFact` (`projectId`,`validFromChapterOrder`,`validToChapterOrder`);--> statement-breakpoint
CREATE INDEX `MemoryFact_projectId_status_idx` ON `MemoryFact` (`projectId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryFact_id_projectId_key` ON `MemoryFact` (`id`,`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryFactEvidence` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`factId` text NOT NULL,
	`evidenceId` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`factId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`evidenceId`,`projectId`) REFERENCES `MemoryEpisodeEvidence`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryFactEvidence_factId_idx` ON `MemoryFactEvidence` (`factId`);--> statement-breakpoint
CREATE TABLE `MemoryFactInvalidation` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`invalidatedFactId` text NOT NULL,
	`invalidatingFactId` text NOT NULL,
	`reason` text NOT NULL,
	`reviewStatus` text DEFAULT 'pending' NOT NULL,
	`reviewerNote` text,
	`reviewedAt` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`invalidatedFactId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`invalidatingFactId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryFactInvalidation_invalidatedFactId_idx` ON `MemoryFactInvalidation` (`invalidatedFactId`);--> statement-breakpoint
CREATE TABLE `MemoryKnowledgeState` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`factId` text NOT NULL,
	`knowerEntityId` text NOT NULL,
	`secretEntityId` text,
	`knowledgeKey` text NOT NULL,
	`knowledgeValue` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`factId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`knowerEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`secretEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `MemoryKnowledgeState_projectId_knower_idx` ON `MemoryKnowledgeState` (`projectId`,`knowerEntityId`);--> statement-breakpoint
CREATE TABLE `MemoryRelationState` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`factId` text NOT NULL,
	`sourceEntityId` text NOT NULL,
	`targetEntityId` text NOT NULL,
	`relation` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`factId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`sourceEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`targetEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryRelationState_projectId_relation_idx` ON `MemoryRelationState` (`projectId`,`relation`);--> statement-breakpoint
CREATE TABLE `MemoryNarrativeSummary` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`summaryType` text NOT NULL,
	`scopeType` text NOT NULL,
	`scopeId` text,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`extractorVersion` text NOT NULL,
	`sourceContentHash` text NOT NULL,
	`generatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`rejectedAt` text,
	`rejectionReason` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummary_projectId_type_idx` ON `MemoryNarrativeSummary` (`projectId`,`summaryType`);--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummary_projectId_scope_idx` ON `MemoryNarrativeSummary` (`projectId`,`scopeType`,`scopeId`);--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummary_projectId_status_idx` ON `MemoryNarrativeSummary` (`projectId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryNarrativeSummary_id_projectId_key` ON `MemoryNarrativeSummary` (`id`,`projectId`);--> statement-breakpoint
CREATE TABLE `MemoryNarrativeSummarySource` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`summaryId` text NOT NULL,
	`sourceType` text NOT NULL,
	`episodeId` text,
	`factId` text,
	`chunkId` text,
	`chapterSummaryId` text,
	`quote` text,
	`contentHash` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`summaryId`,`projectId`) REFERENCES `MemoryNarrativeSummary`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`episodeId`,`projectId`) REFERENCES `MemoryEpisode`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`factId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chunkId`,`projectId`) REFERENCES `MemoryChunk`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterSummaryId`,`projectId`) REFERENCES `ChapterSummary`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	CONSTRAINT "MemoryNarrativeSummarySource_single_source_check" CHECK((
        ("sourceType" = 'episode' AND "episodeId" IS NOT NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'fact' AND "episodeId" IS NULL AND "factId" IS NOT NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chunk' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NOT NULL AND "chapterSummaryId" IS NULL) OR
        ("sourceType" = 'chapter_summary' AND "episodeId" IS NULL AND "factId" IS NULL AND "chunkId" IS NULL AND "chapterSummaryId" IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummarySource_summaryId_idx` ON `MemoryNarrativeSummarySource` (`summaryId`);--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummarySource_projectId_sourceType_idx` ON `MemoryNarrativeSummarySource` (`projectId`,`sourceType`);--> statement-breakpoint
CREATE TABLE `Character` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`firstAppearance` text,
	`attributes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Character_projectId_name_idx` ON `Character` (`projectId`,`name`);--> statement-breakpoint
CREATE INDEX `Character_projectId_createdAt_idx` ON `Character` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `EntityRelation` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceId` text NOT NULL,
	`sourceType` text NOT NULL,
	`targetId` text NOT NULL,
	`targetType` text NOT NULL,
	`relation` text NOT NULL,
	`attributes` text,
	`sourceWorldEntityId` text,
	`targetWorldEntityId` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`sourceWorldEntityId`) REFERENCES `WorldEntity`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`targetWorldEntityId`) REFERENCES `WorldEntity`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `EntityRelation_projectId_sourceId_idx` ON `EntityRelation` (`projectId`,`sourceId`);--> statement-breakpoint
CREATE INDEX `EntityRelation_projectId_targetId_idx` ON `EntityRelation` (`projectId`,`targetId`);--> statement-breakpoint
CREATE INDEX `EntityRelation_projectId_relation_idx` ON `EntityRelation` (`projectId`,`relation`);--> statement-breakpoint
CREATE TABLE `Event` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`firstAppearance` text,
	`attributes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Event_projectId_name_idx` ON `Event` (`projectId`,`name`);--> statement-breakpoint
CREATE INDEX `Event_projectId_createdAt_idx` ON `Event` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Faction` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`firstAppearance` text,
	`attributes` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Faction_projectId_name_idx` ON `Faction` (`projectId`,`name`);--> statement-breakpoint
CREATE INDEX `Faction_projectId_createdAt_idx` ON `Faction` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `ScrapMemo` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ScrapMemo_projectId_sortOrder_idx` ON `ScrapMemo` (`projectId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `ScrapMemo_projectId_updatedAt_idx` ON `ScrapMemo` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE INDEX `ScrapMemo_projectId_sortOrder_updatedAt_idx` ON `ScrapMemo` (`projectId`,`sortOrder`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `Term` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`term` text NOT NULL,
	`definition` text,
	`category` text,
	`order` integer DEFAULT 0 NOT NULL,
	`firstAppearance` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Term_projectId_term_idx` ON `Term` (`projectId`,`term`);--> statement-breakpoint
CREATE INDEX `Term_projectId_createdAt_idx` ON `Term` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `WorldDocument` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`docType` text NOT NULL,
	`payload` text NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `WorldDocument_projectId_docType_key` ON `WorldDocument` (`projectId`,`docType`);--> statement-breakpoint
CREATE INDEX `WorldDocument_projectId_updatedAt_idx` ON `WorldDocument` (`projectId`,`updatedAt`);--> statement-breakpoint
CREATE TABLE `WorldEntity` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`firstAppearance` text,
	`attributes` text,
	`memoryEntityId` text,
	`positionX` real DEFAULT 0 NOT NULL,
	`positionY` real DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`memoryEntityId`,`projectId`) REFERENCES `MemoryEntity`(`id`,`projectId`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `WorldEntity_projectId_type_idx` ON `WorldEntity` (`projectId`,`type`);--> statement-breakpoint
CREATE INDEX `WorldEntity_projectId_name_idx` ON `WorldEntity` (`projectId`,`name`);--> statement-breakpoint
CREATE INDEX `WorldEntity_projectId_createdAt_idx` ON `WorldEntity` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `Snapshot` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`chapterId` text,
	`content` text NOT NULL,
	`contentLength` integer DEFAULT 0 NOT NULL,
	`type` text DEFAULT 'AUTO' NOT NULL,
	`description` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `Snapshot_projectId_createdAt_idx` ON `Snapshot` (`projectId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Snapshot_projectId_chapterId_createdAt_idx` ON `Snapshot` (`projectId`,`chapterId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `Snapshot_projectId_type_createdAt_idx` ON `Snapshot` (`projectId`,`type`,`createdAt`);