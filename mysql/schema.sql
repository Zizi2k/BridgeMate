-- BridgeMate MySQL schema for a NEW database. Run once in MySQL Workbench.
CREATE DATABASE IF NOT EXISTS bridgemate CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE bridgemate;

CREATE TABLE `attempts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`answers` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`)
);

CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);

CREATE TABLE `members` (
	`id` varchar(36) NOT NULL,
	`team_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(16) NOT NULL,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_team_user_unique` UNIQUE(`team_id`,`user_id`)
);

CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` bigint NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);

CREATE TABLE `tasks` (
	`id` varchar(36) NOT NULL,
	`team_id` varchar(36) NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`deliverable` text NOT NULL,
	`assignee_id` varchar(36) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`due_at` varchar(32) NOT NULL,
	`priority` varchar(16) NOT NULL,
	`status` varchar(16) NOT NULL,
	`version` int NOT NULL DEFAULT 1,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);

CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`invite` varchar(32) NOT NULL,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_invite_unique` UNIQUE(`invite`)
);

CREATE TABLE `understandings` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`task_version` int NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`status` varchar(16) NOT NULL,
	`feedback` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `understandings_id` PRIMARY KEY(`id`)
);

CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password` varchar(255) NOT NULL,
	`demo` int NOT NULL DEFAULT 0,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);

ALTER TABLE `attempts` ADD CONSTRAINT `attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `comments` ADD CONSTRAINT `comments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `members` ADD CONSTRAINT `members_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `members` ADD CONSTRAINT `members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `teams` ADD CONSTRAINT `teams_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `understandings` ADD CONSTRAINT `understandings_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;
ALTER TABLE `understandings` ADD CONSTRAINT `understandings_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `sessions_user_index` ON `sessions` (`user_id`);
CREATE INDEX `sessions_expiry_index` ON `sessions` (`expires`);
CREATE TABLE `ai_usage` (
	`id` varchar(96) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`requests` int NOT NULL DEFAULT 0,
	`expires` bigint NOT NULL,
	CONSTRAINT `ai_usage_id` PRIMARY KEY(`id`)
);

ALTER TABLE `ai_usage` ADD CONSTRAINT `ai_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;
CREATE INDEX `ai_usage_expiry_index` ON `ai_usage` (`expires`);


-- Member profiles (included when initializing the schema manually).
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

ALTER TABLE `profiles` ADD CONSTRAINT `profiles_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;