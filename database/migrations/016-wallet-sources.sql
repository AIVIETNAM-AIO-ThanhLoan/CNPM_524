ALTER TABLE accounts
    ADD COLUMN source_key VARCHAR(100) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD UNIQUE KEY unique_user_source (user_id, source_key);
