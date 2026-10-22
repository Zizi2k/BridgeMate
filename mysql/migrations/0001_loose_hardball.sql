CREATE TABLE `ai_usage` (
	`id` varchar(96) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`requests` int NOT NULL DEFAULT 0,
	`expires` bigint NOT NULL,
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `ai_usage` ADD CONSTRAINT `ai_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `ai_usage_expiry_index` ON `ai_usage` (`expires`);