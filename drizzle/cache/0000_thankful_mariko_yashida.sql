CREATE TABLE `ChapterSearchDocument` (
	`chapterId` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`title` text NOT NULL,
	`synopsis` text,
	`searchText` text NOT NULL,
	`wordCount` integer NOT NULL,
	`chapterOrder` integer NOT NULL,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updatedAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE INDEX `ChapterSearchDocument_projectId_idx` ON `ChapterSearchDocument` (`projectId`);--> statement-breakpoint
CREATE INDEX `ChapterSearchDocument_projectId_chapterOrder_idx` ON `ChapterSearchDocument` (`projectId`,`chapterOrder`);--> statement-breakpoint
CREATE TABLE `CharacterAppearance` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`characterId` text NOT NULL,
	`chapterId` text NOT NULL,
	`position` integer NOT NULL,
	`context` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `CharacterAppearance_characterId_chapterId_position_key` ON `CharacterAppearance` (`characterId`,`chapterId`,`position`);--> statement-breakpoint
CREATE INDEX `CharacterAppearance_projectId_chapterId_idx` ON `CharacterAppearance` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `CharacterAppearance_projectId_characterId_chapterId_idx` ON `CharacterAppearance` (`projectId`,`characterId`,`chapterId`);--> statement-breakpoint
CREATE TABLE `TermAppearance` (
	`id` text PRIMARY KEY NOT NULL,
	`projectId` text NOT NULL,
	`termId` text NOT NULL,
	`chapterId` text NOT NULL,
	`position` integer NOT NULL,
	`context` text,
	`createdAt` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `TermAppearance_termId_chapterId_position_key` ON `TermAppearance` (`termId`,`chapterId`,`position`);--> statement-breakpoint
CREATE INDEX `TermAppearance_projectId_chapterId_idx` ON `TermAppearance` (`projectId`,`chapterId`);--> statement-breakpoint
CREATE INDEX `TermAppearance_projectId_termId_chapterId_idx` ON `TermAppearance` (`projectId`,`termId`,`chapterId`);