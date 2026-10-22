-- Khôi phục mật khẩu bằng mã khôi phục: người dùng nhận mã khi đăng ký (hoặc tạo lại khi đã đăng nhập).
-- Chỉ lưu SHA-256 của mã; mã bị thay mới ngay sau mỗi lần dùng nên chỉ dùng được một lần.
ALTER TABLE users
    ADD COLUMN recovery_code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN recovery_code_created_at TIMESTAMP NULL
