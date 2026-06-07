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
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`episodeId`) REFERENCES `MemoryEpisode`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEpisodeEvidence_episodeId_idx` ON `MemoryEpisodeEvidence` (`episodeId`);--> statement-breakpoint
CREATE INDEX `MemoryEpisodeEvidence_projectId_chapterId_idx` ON `MemoryEpisodeEvidence` (`projectId`,`chapterId`);--> statement-breakpoint
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
CREATE INDEX `MemoryStateChangeCandidate_projectId_status_idx` ON `MemoryStateChangeCandidate` (`projectId`,`status`);
