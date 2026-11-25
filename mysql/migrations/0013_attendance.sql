CREATE TABLE employee_assignments (user_id VARCHAR(36) PRIMARY KEY, code VARCHAR(32) NOT NULL UNIQUE, name VARCHAR(120) NOT NULL, rate BIGINT NOT NULL DEFAULT 0, manager INT NOT NULL DEFAULT 0, FOREIGN KEY (user_id) REFERENCES users(id));
--> statement-breakpoint
CREATE TABLE attendance_entries (id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, day VARCHAR(10) NOT NULL, start VARCHAR(32) NOT NULL, end VARCHAR(32), editable INT NOT NULL DEFAULT 0, reason TEXT NOT NULL, updated_by VARCHAR(36) NOT NULL, updated_at VARCHAR(32) NOT NULL, UNIQUE KEY attendance_user_day (user_id,day), FOREIGN KEY (user_id) REFERENCES users(id));
--> statement-breakpoint
CREATE TABLE attendance_audit (id VARCHAR(36) PRIMARY KEY, entry_id VARCHAR(36) NOT NULL, actor_id VARCHAR(36) NOT NULL, data JSON NOT NULL, created_at VARCHAR(32) NOT NULL);
