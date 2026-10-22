-- UC13: lịch sử quy đổi tiền tệ của từng người dùng, dùng bởi /api/currency.
-- Lưu số tiền, kết quả, tỷ giá đã áp dụng và thời điểm quy đổi.
CREATE TABLE exchange_history (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    from_currency CHAR(3) NOT NULL,
    to_currency CHAR(3) NOT NULL,
    amount DECIMAL(20,4) NOT NULL,
    result DECIMAL(24,4) NOT NULL,
    rate_used DECIMAL(24,8) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (amount > 0),
    CHECK (rate_used > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
