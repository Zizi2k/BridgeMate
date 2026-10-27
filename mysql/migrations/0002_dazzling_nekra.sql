CREATE TABLE `profiles` (
	`user_id` varchar(36) NOT NULL,
	`bio` text NOT NULL,
	`interests` text NOT NULL,
	`slogan` varchar(180) NOT NULL,
	`socials` text NOT NULL,
	`avatar` mediumtext NOT NULL,
	`updated_at` varchar(32) NOT NULL,
	CONSTRAINT `profiles_user_id` PRIMARY KEY(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;