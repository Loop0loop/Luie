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
CREATE INDEX `MemoryWriterTaskBenchmarkRun_runId_idx` ON `MemoryWriterTaskBenchmarkRun` (`runId`);
--> statement-breakpoint
CREATE INDEX `MemoryWriterTaskBenchmarkRun_projectId_updatedAt_idx` ON `MemoryWriterTaskBenchmarkRun` (`projectId`,`updatedAt`);
