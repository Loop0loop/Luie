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
CREATE INDEX `MemoryEvalFeedback_projectId_status_idx` ON `MemoryEvalFeedback` (`projectId`,`status`);
--> statement-breakpoint
CREATE INDEX `MemoryEvalFeedback_projectId_kind_idx` ON `MemoryEvalFeedback` (`projectId`,`feedbackKind`);
--> statement-breakpoint
CREATE INDEX `MemoryEvalFeedback_caseId_idx` ON `MemoryEvalFeedback` (`caseId`);
