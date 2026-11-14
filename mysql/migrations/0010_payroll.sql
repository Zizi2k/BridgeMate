CREATE TABLE IF NOT EXISTS payroll_entries (
 id VARCHAR(36) PRIMARY KEY,
 scope_id VARCHAR(48) NOT NULL,
 data JSON NOT NULL,
 INDEX payroll_scope_idx (scope_id)
) ENGINE=InnoDB;
