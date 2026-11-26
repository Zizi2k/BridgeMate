ALTER TABLE users ADD COLUMN email_verified_at VARCHAR(32) NULL;
CREATE TABLE email_verifications (
 email VARCHAR(254) NOT NULL PRIMARY KEY,
 name VARCHAR(80) NOT NULL,
 password VARCHAR(255) NOT NULL,
 token_hash VARCHAR(64) NOT NULL,
 expires BIGINT NOT NULL,
 sent_at BIGINT NOT NULL,
 window_start BIGINT NOT NULL,
 sends INT NOT NULL DEFAULT 0,
 UNIQUE INDEX email_verification_token (token_hash)
);
CREATE TABLE email_verification_limits (
 id VARCHAR(64) NOT NULL PRIMARY KEY,
 window_start BIGINT NOT NULL,
 requests INT NOT NULL
);
