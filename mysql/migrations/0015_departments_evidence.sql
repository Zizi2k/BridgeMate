CREATE TABLE departments (id VARCHAR(36) PRIMARY KEY,name VARCHAR(120) NOT NULL UNIQUE,active INT NOT NULL DEFAULT 1);
--> statement-breakpoint
CREATE TABLE account_departments (user_id VARCHAR(36) PRIMARY KEY,department_id VARCHAR(36) NOT NULL,status VARCHAR(12) NOT NULL,KEY account_department_idx (department_id,status),FOREIGN KEY (user_id) REFERENCES users(id),FOREIGN KEY (department_id) REFERENCES departments(id));
--> statement-breakpoint
CREATE TABLE attendance_photos (id VARCHAR(36) PRIMARY KEY,entry_id VARCHAR(36) NOT NULL,name VARCHAR(180) NOT NULL,mime VARCHAR(120) NOT NULL,data MEDIUMTEXT NOT NULL,created_at VARCHAR(32) NOT NULL,expires_at VARCHAR(32) NOT NULL,KEY attendance_photos_expiry (expires_at),KEY attendance_photos_entry (entry_id),FOREIGN KEY (entry_id) REFERENCES attendance_entries(id) ON DELETE CASCADE);
