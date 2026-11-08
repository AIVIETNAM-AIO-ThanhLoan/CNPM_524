CREATE TABLE budget_rollovers (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    month_start DATE NOT NULL,
    PRIMARY KEY (user_id, month_start),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
