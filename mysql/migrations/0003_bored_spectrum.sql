CREATE TABLE `phrase_entries` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`category` varchar(32) NOT NULL,
	`en` text NOT NULL,
	`vi` text NOT NULL,
	`deleted` int NOT NULL DEFAULT 0,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `phrase_entries_user_id_id_pk` PRIMARY KEY(`user_id`,`id`)
);
--> statement-breakpoint
ALTER TABLE `phrase_entries` ADD CONSTRAINT `phrase_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;