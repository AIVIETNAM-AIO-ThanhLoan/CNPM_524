-- UC01: xác thực hai bước bằng TOTP (ứng dụng Google Authenticator, Microsoft Authenticator...).
-- totp_secret được tạo khi bắt đầu cài đặt; chỉ có hiệu lực khi totp_enabled = TRUE.
-- totp_last_step chặn dùng lại cùng một mã trong khung 30 giây.
ALTER TABLE users
    ADD COLUMN totp_secret VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN totp_last_step BIGINT UNSIGNED NULL;

-- Bước 1 đăng nhập đúng mật khẩu chỉ tạo phiên chờ (không phải session), hết hạn sau 5 phút
-- và bị hủy khi nhập sai mã quá số lần cho phép.
CREATE TABLE login_challenges (
    token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX (expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Mã dự phòng dùng một lần khi mất điện thoại; chỉ lưu SHA-256.
CREATE TABLE totp_recovery_codes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    used_at TIMESTAMP NULL,
    UNIQUE KEY (user_id, code_hash),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
