CREATE UNIQUE INDEX `MemoryEntity_id_projectId_key` ON `MemoryEntity` (`id`,`projectId`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEpisodeEvidence_id_projectId_key` ON `MemoryEpisodeEvidence` (`id`,`projectId`);--> statement-breakpoint
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
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`invalidatedFactId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`invalidatingFactId`,`projectId`) REFERENCES `MemoryFact`(`id`,`projectId`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryFactInvalidation_invalidatedFactId_idx` ON `MemoryFactInvalidation` (`invalidatedFactId`);--> statement-breakpoint
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
CREATE INDEX `MemoryKnowledgeState_projectId_knower_idx` ON `MemoryKnowledgeState` (`projectId`,`knowerEntityId`);
