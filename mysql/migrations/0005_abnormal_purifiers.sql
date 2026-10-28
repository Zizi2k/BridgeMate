CREATE TABLE `leader_votes` (
	`team_id` varchar(36) NOT NULL,
	`voter_id` varchar(36) NOT NULL,
	`candidate_id` varchar(36) NOT NULL,
	CONSTRAINT `leader_votes_team_id_voter_id_pk` PRIMARY KEY(`team_id`,`voter_id`)
);
--> statement-breakpoint
CREATE TABLE `subtasks` (
	`id` varchar(36) NOT NULL,
	`task_id` varchar(36) NOT NULL,
	`title` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`assignee_id` varchar(36) NOT NULL,
	`due_at` varchar(32) NOT NULL DEFAULT '',
	`status` varchar(16) NOT NULL DEFAULT 'todo',
	`deleted` int NOT NULL DEFAULT 0,
	`created_at` varchar(32) NOT NULL,
	CONSTRAINT `subtasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_collaborators` (
	`task_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	CONSTRAINT `task_collaborators_task_id_user_id_pk` PRIMARY KEY(`task_id`,`user_id`)
);
--> statement-breakpoint
ALTER TABLE `tasks` ADD `deleted` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `teams` ADD `leader_id` varchar(36);--> statement-breakpoint
ALTER TABLE `leader_votes` ADD CONSTRAINT `leader_votes_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leader_votes` ADD CONSTRAINT `leader_votes_voter_id_users_id_fk` FOREIGN KEY (`voter_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leader_votes` ADD CONSTRAINT `leader_votes_candidate_id_users_id_fk` FOREIGN KEY (`candidate_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subtasks` ADD CONSTRAINT `subtasks_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subtasks` ADD CONSTRAINT `subtasks_assignee_id_users_id_fk` FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_collaborators` ADD CONSTRAINT `task_collaborators_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_collaborators` ADD CONSTRAINT `task_collaborators_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `subtasks_task_index` ON `subtasks` (`task_id`);--> statement-breakpoint
ALTER TABLE `teams` ADD CONSTRAINT `teams_leader_id_users_id_fk` FOREIGN KEY (`leader_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;