ALTER TABLE attendance_entries ADD COLUMN kind VARCHAR(12) NOT NULL DEFAULT 'regular', ADD COLUMN work_label VARCHAR(180) NOT NULL DEFAULT '', ADD COLUMN regular_day VARCHAR(10) NULL, ADD INDEX attendance_employee_day(user_id,day);
--> statement-breakpoint
UPDATE attendance_entries SET regular_day=day WHERE kind='regular';
--> statement-breakpoint
ALTER TABLE attendance_entries DROP INDEX attendance_user_day, ADD UNIQUE INDEX attendance_user_day(user_id,regular_day);
