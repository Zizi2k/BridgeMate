CREATE TABLE `task_completions` (
	`task_id` varchar(36) NOT NULL,
	`team_id` varchar(36) NOT NULL,
	`recipients` text NOT NULL,
	`completed_at` varchar(32) NOT NULL,
	CONSTRAINT `task_completions_task_id` PRIMARY KEY(`task_id`)
);
--> statement-breakpoint
ALTER TABLE `task_completions` ADD CONSTRAINT `task_completions_task_id_tasks_id_fk` FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_completions` ADD CONSTRAINT `task_completions_team_id_teams_id_fk` FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `task_completions_team_index` ON `task_completions` (`team_id`);--> statement-breakpoint
-- Existing completed work is credited once using its current participant roster.
INSERT IGNORE INTO `task_completions` (`task_id`,`team_id`,`recipients`,`completed_at`)
SELECT earned.task_id, earned.team_id, JSON_ARRAYAGG(earned.user_id), DATE_FORMAT(UTC_TIMESTAMP(3),'%Y-%m-%dT%H:%i:%s.%fZ')
FROM (
 SELECT t.id AS task_id,t.team_id,t.assignee_id AS user_id FROM tasks t INNER JOIN teams tm ON tm.id=t.team_id WHERE t.status='done' AND t.deleted=0 AND tm.deleted=0
 UNION
 SELECT t.id AS task_id,t.team_id,c.user_id FROM task_collaborators c INNER JOIN tasks t ON t.id=c.task_id INNER JOIN teams tm ON tm.id=t.team_id WHERE t.status='done' AND t.deleted=0 AND tm.deleted=0
) earned
GROUP BY earned.task_id,earned.team_id;
