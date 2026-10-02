CREATE TABLE `event_installation` (
	`singleton` integer PRIMARY KEY,
	`installation_id` text NOT NULL UNIQUE,
	`created_at` integer NOT NULL,
	CONSTRAINT "event_installation_singleton_check" CHECK("singleton" = 1),
	CONSTRAINT "event_installation_uuid_check" CHECK(length("installation_id") = 36 and substr("installation_id", 15, 1) = '7')
);
--> statement-breakpoint
CREATE TABLE `outbox_events` (
	`id` text PRIMARY KEY,
	`event_type` text NOT NULL,
	`subject` text NOT NULL,
	`content` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`dispatched_at` integer,
	CONSTRAINT "outbox_events_uuid_check" CHECK(length("id") = 36 and substr("id", 15, 1) = '7'),
	CONSTRAINT "outbox_events_content_check" CHECK(json_valid("content"))
);
--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
	`id` text PRIMARY KEY,
	`event_id` text NOT NULL,
	`subscription_id` text NOT NULL,
	`replay_number` integer DEFAULT 0 NOT NULL,
	`replay_of` text,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer,
	`last_attempt_at` integer,
	`delivered_at` integer,
	`response_status` integer,
	`error` text,
	`created_at` integer NOT NULL,
	CONSTRAINT `fk_webhook_deliveries_event_id_outbox_events_id_fk` FOREIGN KEY (`event_id`) REFERENCES `outbox_events`(`id`),
	CONSTRAINT `fk_webhook_deliveries_subscription_id_webhook_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `webhook_subscriptions`(`id`),
	CONSTRAINT "webhook_deliveries_uuid_check" CHECK(length("id") = 36 and substr("id", 15, 1) = '7'),
	CONSTRAINT "webhook_deliveries_status_check" CHECK("status" in ('queued', 'sending', 'retrying', 'delivered', 'failed')),
	CONSTRAINT "webhook_deliveries_attempts_check" CHECK("attempts" between 0 and 10),
	CONSTRAINT "webhook_deliveries_lease_check" CHECK("lease" >= 0),
	CONSTRAINT "webhook_deliveries_replay_check" CHECK("replay_number" >= 0)
);
--> statement-breakpoint
CREATE TABLE `webhook_subscriptions` (
	`id` text PRIMARY KEY,
	`request_id` text NOT NULL UNIQUE,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`event_types` text NOT NULL,
	`status` text NOT NULL,
	`key_version` integer DEFAULT 1 NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_by_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	CONSTRAINT `fk_webhook_subscriptions_created_by_user_id_users_id_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`),
	CONSTRAINT "webhook_subscriptions_uuid_check" CHECK(length("id") = 36 and substr("id", 15, 1) = '7'),
	CONSTRAINT "webhook_subscriptions_request_id_check" CHECK(length("request_id") = 36),
	CONSTRAINT "webhook_subscriptions_name_check" CHECK(length(trim("name")) between 1 and 80),
	CONSTRAINT "webhook_subscriptions_url_check" CHECK(length("url") between 1 and 2048),
	CONSTRAINT "webhook_subscriptions_events_check" CHECK(json_valid("event_types")),
	CONSTRAINT "webhook_subscriptions_status_check" CHECK("status" in ('active', 'disabled')),
	CONSTRAINT "webhook_subscriptions_key_version_check" CHECK("key_version" > 0),
	CONSTRAINT "webhook_subscriptions_version_check" CHECK("version" > 0),
	CONSTRAINT "webhook_subscriptions_timestamps_check" CHECK("updated_at" >= "created_at")
);
--> statement-breakpoint
CREATE INDEX `outbox_events_dispatch_index` ON `outbox_events` (`dispatched_at`,`occurred_at`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `webhook_deliveries_event_subscription_replay_unique` ON `webhook_deliveries` (`event_id`,`subscription_id`,`replay_number`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_due_index` ON `webhook_deliveries` (`status`,`next_attempt_at`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `webhook_deliveries_subscription_index` ON `webhook_deliveries` (`subscription_id`,`created_at`,`id`);
--> statement-breakpoint
INSERT INTO `permissions` (`code`) VALUES
  ('webhook.subscription.read'),
  ('webhook.subscription.manage'),
  ('webhook.delivery.read'),
  ('webhook.delivery.replay');
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_code`)
SELECT `id`, `permissions`.`code`
FROM `roles`
CROSS JOIN `permissions`
WHERE `roles`.`name` = 'administrator'
  AND `permissions`.`code` IN (
    'webhook.subscription.read',
    'webhook.subscription.manage',
    'webhook.delivery.read',
    'webhook.delivery.replay'
  );
