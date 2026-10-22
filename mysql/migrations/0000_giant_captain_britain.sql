CREATE TABLE `attempts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`score` int NOT NULL,
	`answers` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `attempts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`author_id` varchar(36) NOT NULL,
	`content` text NOT NULL,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `comments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `members` (
	`id` varchar(36) NOT NULL,
	`team_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`role` varchar(16) NOT NULL,
	CONSTRAINT `members_id` PRIMARY KEY(`id`),
	CONSTRAINT `members_team_user_unique` UNIQUE(`team_id`,`user_id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` varchar(64) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expires` bigint NOT NULL,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `teams` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`description` text NOT NULL,
	`owner_id` varchar(36) NOT NULL,
	`invite` varchar(32) NOT NULL,
	CONSTRAINT `teams_id` PRIMARY KEY(`id`),
	CONSTRAINT `teams_invite_unique` UNIQUE(`invite`)
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`name` varchar(80) NOT NULL,
	`email` varchar(254) NOT NULL,
	`password` varchar(255) NOT NULL,
	`demo` int NOT NULL DEFAULT 0,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
ALTER TABLE `attempts` ADD CONSTRAINT `attempts_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `comments` ADD CONSTRAINT `comments_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `members` ADD CONSTRAINT `members_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sessions` ADD CONSTRAINT `sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_owner_id_users_id_fk` FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `understandings` ADD CONSTRAINT `understandings_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `understandings` ADD CONSTRAINT `understandings_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `sessions_user_index` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expiry_index` ON `sessions` (`expires`);