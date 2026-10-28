ALTER TABLE accounts ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE categories ADD COLUMN archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE recurring_transactions
    ADD COLUMN name VARCHAR(100) NOT NULL DEFAULT 'Thanh toán định kỳ',
    ADD COLUMN anchor_day TINYINT UNSIGNED NULL,
    ADD COLUMN anchor_month TINYINT UNSIGNED NULL;
UPDATE recurring_transactions SET anchor_day = DAY(next_due_on), anchor_month = MONTH(next_due_on);

CREATE TABLE recurring_payments (
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    recurring_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    due_on DATE NOT NULL,
    transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    PRIMARY KEY (recurring_id, due_on),
    FOREIGN KEY (user_id, recurring_id) REFERENCES recurring_transactions(user_id, id),
    FOREIGN KEY (user_id, transaction_id) REFERENCES transactions(user_id, id)
) ENGINE=InnoDB;

CREATE TABLE notifications (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    event_key VARCHAR(190) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    kind ENUM('budget', 'reminder') NOT NULL,
    title VARCHAR(160) NOT NULL,
    body VARCHAR(500) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    UNIQUE KEY (user_id, event_key),
    UNIQUE KEY (user_id, id),
    INDEX (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE push_subscriptions (
    id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    endpoint TEXT NOT NULL,
    endpoint_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL UNIQUE,
    p256dh VARCHAR(100) NOT NULL,
    auth VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE push_deliveries (
    notification_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    subscription_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    next_attempt_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at DATETIME NULL,
    last_error VARCHAR(100) NULL,
    PRIMARY KEY (notification_id, subscription_id),
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
