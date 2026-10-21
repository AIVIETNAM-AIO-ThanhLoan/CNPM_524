-- UC09: cảnh báo ngân sách của từng người dùng, phát sinh sau khi ghi chi thành công.
-- threshold là phần trăm ngưỡng đã chạm (giá trị cụ thể do UC08 chốt, ví dụ 80 và 100).
-- UNIQUE (user_id, category_id, month_start, threshold): mỗi ngưỡng chỉ cảnh báo một lần mỗi tháng,
-- kể cả khi ghi đồng thời hoặc gửi lại yêu cầu.
CREATE TABLE budget_alerts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    category_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    month_start DATE NOT NULL,
    threshold TINYINT UNSIGNED NOT NULL,
    budget_amount DECIMAL(14,2) NOT NULL,
    spent_amount DECIMAL(14,2) NOT NULL,
    transaction_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP NULL,
    UNIQUE KEY (user_id, category_id, month_start, threshold),
    INDEX (user_id, read_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, category_id) REFERENCES categories(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, transaction_id) REFERENCES transactions(user_id, id) ON DELETE CASCADE,
    CHECK (threshold > 0),
    CHECK (budget_amount > 0),
    CHECK (DAYOFMONTH(month_start) = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
