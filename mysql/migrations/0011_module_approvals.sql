CREATE TABLE IF NOT EXISTS module_approvals (
 user_id VARCHAR(36) NOT NULL,
 module VARCHAR(24) NOT NULL,
 status VARCHAR(12) NOT NULL,
 PRIMARY KEY (user_id,module),
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS print_settings (
 id VARCHAR(36) PRIMARY KEY,
 data JSON NOT NULL
) ENGINE=InnoDB;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS removed_accounts (
 user_id VARCHAR(36) PRIMARY KEY,
 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
