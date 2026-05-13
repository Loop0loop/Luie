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
CREATE INDEX `ChapterRevision_chapterId_createdAt_idx` ON `ChapterRevision` (`chapterId`,`createdAt`);
--> statement-breakpoint
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
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `SearchDirtyQueue_projectId_status_idx` ON `SearchDirtyQueue` (`projectId`,`status`);
--> statement-breakpoint
CREATE INDEX `SearchDirtyQueue_source_idx` ON `SearchDirtyQueue` (`sourceType`,`sourceId`);
--> statement-breakpoint
CREATE TABLE `MemoryChunk` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`sourceType` text NOT NULL,
	`sourceId` text NOT NULL,
	`chapterId` text,
	`chunkIndex` integer NOT NULL,
	`content` text NOT NULL,
	`contentHash` text NOT NULL,
	`startOffset` integer,
	`endOffset` integer,
	`tokenCount` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryChunk_source_chunkIndex_key` ON `MemoryChunk` (`sourceType`,`sourceId`,`chunkIndex`);
--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_source_idx` ON `MemoryChunk` (`projectId`,`sourceType`,`sourceId`);
--> statement-breakpoint
CREATE INDEX `MemoryChunk_projectId_chapterId_idx` ON `MemoryChunk` (`projectId`,`chapterId`);
--> statement-breakpoint
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
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `MemoryBuildJob_projectId_status_priority_idx` ON `MemoryBuildJob` (`projectId`,`status`,`priority`);
--> statement-breakpoint
CREATE INDEX `MemoryBuildJob_target_idx` ON `MemoryBuildJob` (`targetType`,`targetId`);
