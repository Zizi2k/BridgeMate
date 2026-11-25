ALTER TABLE users ADD COLUMN must_change_password INT NOT NULL DEFAULT 0;
--> statement-breakpoint
CREATE TABLE password_recovery (user_id VARCHAR(36) PRIMARY KEY,status VARCHAR(16) NOT NULL,requested_at VARCHAR(32) NOT NULL,reviewed_at VARCHAR(32),reviewed_by VARCHAR(36),FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);
