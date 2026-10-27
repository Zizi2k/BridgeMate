CREATE TABLE `practice_entries` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`deleted` int NOT NULL DEFAULT 0,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `practice_entries_user_id_id_pk` PRIMARY KEY(`user_id`,`id`)
);
--> statement-breakpoint
ALTER TABLE `practice_entries` ADD CONSTRAINT `practice_entries_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;