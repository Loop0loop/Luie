ALTER TABLE `MemoryChunk` ADD `indexText` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `MemoryChunk` ADD `indexTextHash` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `MemoryChunk` ADD `contextLabel` text;--> statement-breakpoint
ALTER TABLE `MemoryChunk` ADD `sourceContentHash` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `MemoryChunk`
SET
  `indexText` = `content`,
  `indexTextHash` = `contentHash`,
  `sourceContentHash` = ''
WHERE `indexText` = '';
