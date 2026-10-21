-- UC07: hủy hoặc điều chỉnh giao dịch bằng bút toán đối ứng; không sửa hay xóa giao dịch gốc.
-- Hủy: tạo giao dịch mới có reverses_id = giao dịch gốc, cùng kind/amount, dòng sổ đổi dấu.
-- Điều chỉnh: hủy giao dịch gốc như trên rồi ghi giao dịch mới có replaces_id = giao dịch gốc.
-- UNIQUE (user_id, reverses_id) / (user_id, replaces_id): mỗi giao dịch chỉ bị đảo và bị thay thế tối đa một lần.
-- Báo cáo phải trừ giao dịch đảo (reverses_id IS NOT NULL) khỏi tổng thu/chi của kind tương ứng.
ALTER TABLE transactions
    ADD COLUMN reverses_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN replaces_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD COLUMN reason VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN created_by CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
    ADD UNIQUE KEY uniq_transaction_reverses (user_id, reverses_id),
    ADD UNIQUE KEY uniq_transaction_replaces (user_id, replaces_id),
    ADD CONSTRAINT fk_transaction_reverses FOREIGN KEY (user_id, reverses_id) REFERENCES transactions(user_id, id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transaction_replaces FOREIGN KEY (user_id, replaces_id) REFERENCES transactions(user_id, id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_transaction_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    ADD CONSTRAINT chk_transaction_link CHECK (reverses_id IS NULL OR replaces_id IS NULL),
    ADD CONSTRAINT chk_transaction_not_self CHECK ((reverses_id IS NULL OR reverses_id <> id) AND (replaces_id IS NULL OR replaces_id <> id)),
    ADD CONSTRAINT chk_transaction_reason CHECK ((reverses_id IS NULL AND replaces_id IS NULL) OR reason <> '');

-- Dấu vết người tạo cho các giao dịch đã có.
UPDATE transactions SET created_by = user_id WHERE created_by IS NULL
