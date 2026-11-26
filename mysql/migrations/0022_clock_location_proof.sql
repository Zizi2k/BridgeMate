ALTER TABLE attendance_entries ADD COLUMN locations JSON NULL;
--> statement-breakpoint
ALTER TABLE attendance_photos ADD COLUMN clock_action VARCHAR(8) NULL;
