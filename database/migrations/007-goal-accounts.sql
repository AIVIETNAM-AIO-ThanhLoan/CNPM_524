-- UC15: tiền tích lũy cho mục tiêu được chuyển thật từ ví sang tài khoản sổ cái riêng của mục tiêu (kind = 'goal').
-- Góp = chuyển ví -> mục tiêu, rút = chuyển mục tiêu -> ví. Đây là transfer nên không tính vào tổng thu/chi,
-- tiến độ = số dư tài khoản mục tiêu, số dư ví giảm tương ứng nên không bị đếm hai lần.
ALTER TABLE accounts MODIFY kind ENUM('wallet', 'income', 'expense', 'equity', 'goal') NOT NULL;

ALTER TABLE goals
    ADD COLUMN account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER user_id,
    ADD COLUMN status ENUM('active', 'achieved', 'closed') NOT NULL DEFAULT 'active',
    ADD COLUMN closed_at TIMESTAMP NULL,
    ADD COLUMN created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Tạo tài khoản sổ cái cho các mục tiêu đã có, dùng chính id mục tiêu làm id tài khoản.
INSERT INTO accounts (id, user_id, name, kind)
    SELECT id, user_id, CONCAT('Mục tiêu: ', CONVERT(id USING utf8mb4)), 'goal' FROM goals;
UPDATE goals SET account_id = id;

ALTER TABLE goals
    MODIFY account_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    ADD UNIQUE KEY (account_id),
    ADD UNIQUE KEY (user_id, id),
    ADD FOREIGN KEY (user_id, account_id) REFERENCES accounts(user_id, id) ON DELETE CASCADE
