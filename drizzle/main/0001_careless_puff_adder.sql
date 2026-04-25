PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ProjectSettings` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`autoSave` integer DEFAULT 1 NOT NULL,
	`autoSaveInterval` integer DEFAULT 30 NOT NULL,
	FOREIGN KEY (`projectId`) REFERENCES `Project`(`id`) ON UPDATE cascade ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ProjectSettings`("id", "projectId", "autoSave", "autoSaveInterval") SELECT "id", "projectId", "autoSave", "autoSaveInterval" FROM `ProjectSettings`;--> statement-breakpoint
DROP TABLE `ProjectSettings`;--> statement-breakpoint
ALTER TABLE `__new_ProjectSettings` RENAME TO `ProjectSettings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `ProjectSettings_projectId_key` ON `ProjectSettings` (`projectId`);