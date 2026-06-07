CREATE TABLE `MemoryEvalCase` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`name` text NOT NULL,
	`question` text NOT NULL,
	`caseType` text DEFAULT 'qa' NOT NULL,
	`expectedAnswer` text,
	`temporalScopeStartChapterId` text,
	`temporalScopeEndChapterId` text,
	`severity` text DEFAULT 'p1' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalCase_projectId_caseType_idx` ON `MemoryEvalCase` (`projectId`,`caseType`);--> statement-breakpoint
CREATE INDEX `MemoryEvalCase_projectId_severity_idx` ON `MemoryEvalCase` (`projectId`,`severity`);--> statement-breakpoint
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
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`runId`) REFERENCES `MemoryEvalRun`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`caseId`) REFERENCES `MemoryEvalCase`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_runId_idx` ON `MemoryEvalResult` (`runId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_caseId_idx` ON `MemoryEvalResult` (`caseId`);--> statement-breakpoint
CREATE INDEX `MemoryEvalResult_projectId_p0_idx` ON `MemoryEvalResult` (`projectId`,`p0FailureCount`);
