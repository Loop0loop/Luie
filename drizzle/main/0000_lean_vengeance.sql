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
CREATE TABLE `Project` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`projectPath` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ProjectAttachment` (
	`projectId` text PRIMARY KEY NOT NULL,
	`projectPath` text,
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
	`autoSave` integer DEFAULT true NOT NULL,
	`autoSaveInterval` integer DEFAULT 30 NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ProjectSettings_projectId_key` ON `ProjectSettings` (`projectId`);--> statement-breakpoint
CREATE TABLE `ScrapMemo` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`tags` text DEFAULT '[]' NOT NULL,
	`sortOrder` integer DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ScrapMemo_projectId_sortOrder_idx` ON `ScrapMemo` (`projectId`,`sortOrder`);--> statement-breakpoint
CREATE INDEX `ScrapMemo_projectId_updatedAt_idx` ON `ScrapMemo` (`projectId`,`updatedAt`);--> statement-breakpoint
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
CREATE INDEX `Snapshot_projectId_type_createdAt_idx` ON `Snapshot` (`projectId`,`type`,`createdAt`);--> statement-breakpoint
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
	`positionX` real DEFAULT 0 NOT NULL,
	`positionY` real DEFAULT 0 NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `WorldEntity_projectId_type_idx` ON `WorldEntity` (`projectId`,`type`);--> statement-breakpoint
CREATE INDEX `WorldEntity_projectId_name_idx` ON `WorldEntity` (`projectId`,`name`);