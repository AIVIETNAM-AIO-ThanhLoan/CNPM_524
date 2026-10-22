-- UC19: kết quả mỗi lần sao lưu (npm run db:backup), kể cả lần lỗi.
-- file_path là đường dẫn tương đối tới file dump; không lưu mật khẩu hay lệnh chạy.
CREATE TABLE backup_runs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    trigger_type ENUM('manual', 'schedule') NOT NULL,
    status ENUM('running', 'success', 'failed') NOT NULL DEFAULT 'running',
    started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP NULL,
    file_path VARCHAR(255) NULL,
    size_bytes BIGINT UNSIGNED NULL,
    checksum CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    error VARCHAR(500) NULL,
    INDEX (started_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
