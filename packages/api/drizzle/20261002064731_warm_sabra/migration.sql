ALTER TABLE `webhook_deliveries` ADD `completed_at` integer;
--> statement-breakpoint
UPDATE `webhook_deliveries`
SET `completed_at` = coalesce(`delivered_at`, `last_attempt_at`, `created_at`)
WHERE `status` IN ('delivered', 'failed');
