CREATE UNIQUE INDEX `MemoryChunk_id_projectId_key` ON `MemoryChunk` (`id`,`projectId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ChapterSummary_id_projectId_key` ON `ChapterSummary` (`id`,`projectId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEpisode_id_projectId_key` ON `MemoryEpisode` (`id`,`projectId`);--> statement-breakpoint
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
	CONSTRAINT `MemoryNarrativeSummarySource_single_source_check` CHECK (
		(`sourceType` = 'episode' AND `episodeId` IS NOT NULL AND `factId` IS NULL AND `chunkId` IS NULL AND `chapterSummaryId` IS NULL) OR
		(`sourceType` = 'fact' AND `episodeId` IS NULL AND `factId` IS NOT NULL AND `chunkId` IS NULL AND `chapterSummaryId` IS NULL) OR
		(`sourceType` = 'chunk' AND `episodeId` IS NULL AND `factId` IS NULL AND `chunkId` IS NOT NULL AND `chapterSummaryId` IS NULL) OR
		(`sourceType` = 'chapter_summary' AND `episodeId` IS NULL AND `factId` IS NULL AND `chunkId` IS NULL AND `chapterSummaryId` IS NOT NULL)
	)
);
--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummarySource_summaryId_idx` ON `MemoryNarrativeSummarySource` (`summaryId`);--> statement-breakpoint
CREATE INDEX `MemoryNarrativeSummarySource_projectId_sourceType_idx` ON `MemoryNarrativeSummarySource` (`projectId`,`sourceType`);
