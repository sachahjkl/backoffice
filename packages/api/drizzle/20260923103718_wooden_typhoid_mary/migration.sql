CREATE TABLE `branding_settings` (
	`id` integer PRIMARY KEY,
	`name` text,
	`logo_url` text,
	`version` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "branding_settings_singleton_check" CHECK("id" = 1),
	CONSTRAINT "branding_settings_version_check" CHECK("version" >= 0)
);
--> statement-breakpoint
INSERT INTO `branding_settings` (`id`, `name`, `logo_url`, `version`) VALUES (1, NULL, NULL, 0);
