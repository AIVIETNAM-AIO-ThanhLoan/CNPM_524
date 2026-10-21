-- UC11: lịch sử nhắc khoản định kỳ để không gửi trùng.
-- Khóa (recurring_id, due_on, remind_on, channel): chạy lại job cùng ngày không tạo nhắc thứ hai.
-- Gửi lỗi giữ status = 'failed' và attempts để job sau thử lại.
ALTER TABLE recurring_transactions ADD UNIQUE KEY (user_id, id);

CREATE TABLE reminder_deliveries (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    recurring_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    due_on DATE NOT NULL,
    remind_on DATE NOT NULL,
    channel ENUM('in_app') NOT NULL DEFAULT 'in_app',
    status ENUM('pending', 'sent', 'failed') NOT NULL DEFAULT 'pending',
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    last_error VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    read_at TIMESTAMP NULL,
    UNIQUE KEY (recurring_id, due_on, remind_on, channel),
    INDEX (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, recurring_id) REFERENCES recurring_transactions(user_id, id) ON DELETE CASCADE,
    CHECK (remind_on <= due_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
