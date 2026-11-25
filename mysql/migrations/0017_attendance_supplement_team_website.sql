ALTER TABLE attendance_entries ADD COLUMN supplemented INT NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE teams ADD COLUMN website VARCHAR(2048) NOT NULL DEFAULT '';
