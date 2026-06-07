CREATE TABLE `MemoryEntity` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`entityType` text NOT NULL,
	`canonicalName` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`confidence` integer DEFAULT 0 NOT NULL,
	`createdBy` text DEFAULT 'system' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	`deletedAt` text,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `MemoryEntity_projectId_type_idx` ON `MemoryEntity` (`projectId`,`entityType`);--> statement-breakpoint
CREATE INDEX `MemoryEntity_projectId_status_idx` ON `MemoryEntity` (`projectId`,`status`);--> statement-breakpoint
CREATE UNIQUE INDEX `MemoryEntity_projectId_type_name_key` ON `MemoryEntity` (`projectId`,`entityType`,`canonicalName`);--> statement-breakpoint
CREATE TABLE `MemoryEntityAlias` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`entityId` text NOT NULL,
	`entityType` text NOT NULL,
	`alias` text NOT NULL,
	`normalizedAlias` text NOT NULL,
	`status` text DEFAULT 'suggested' NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
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
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`entityId`) REFERENCES `MemoryEntity`(`id`) ON UPDATE cascade ON DELETE cascade,
	FOREIGN KEY (`aliasId`) REFERENCES `MemoryEntityAlias`(`id`) ON UPDATE cascade ON DELETE set null,
	FOREIGN KEY (`chapterId`) REFERENCES `Chapter`(`id`) ON UPDATE cascade ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `MemoryEntityMention_entityId_idx` ON `MemoryEntityMention` (`entityId`);--> statement-breakpoint
CREATE INDEX `MemoryEntityMention_projectId_chapterId_idx` ON `MemoryEntityMention` (`projectId`,`chapterId`);
