CREATE TABLE IF NOT EXISTS personal_entries (
  id VARCHAR(36) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  kind VARCHAR(8) NOT NULL,
  data JSON NOT NULL,
  PRIMARY KEY (id),
  KEY personal_entries_owner_kind (user_id, kind),
  CONSTRAINT personal_entries_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
