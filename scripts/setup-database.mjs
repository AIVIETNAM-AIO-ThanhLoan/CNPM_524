import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { databaseConfig } from '../database/config.mjs';

const MIGRATIONS = [
    ['001_initial', '../database/schema.sql'],
    ['002_block_sessions', '../database/migrations/002-block-sessions.sql'],
    ['003_exchange_history', '../database/migrations/003-exchange-history.sql'],
    ['004_two_factor', '../database/migrations/004-two-factor.sql'],
    ['005_password_recovery', '../database/migrations/005-password-recovery.sql'],
    ['006_transaction_reversal', '../database/migrations/006-transaction-reversal.sql'],
    ['007_goal_accounts', '../database/migrations/007-goal-accounts.sql'],
    ['008_budget_alerts', '../database/migrations/008-budget-alerts.sql'],
    ['009_reminder_deliveries', '../database/migrations/009-reminder-deliveries.sql'],
    ['010_backup_runs', '../database/migrations/010-backup-runs.sql'],
];

async function main() {
    nextEnv.loadEnvConfig(process.cwd());
    const config = databaseConfig();
    const setupUser = process.env.DB_SETUP_USER;
    const setupPassword = process.env.DB_SETUP_PASSWORD;
    if (!setupUser || setupPassword === undefined) {
        throw new Error('Cần DB_SETUP_USER và DB_SETUP_PASSWORD (có thể rỗng với XAMPP mặc định).');
    }
    const connection = await mysql.createConnection({ ...config, database: undefined,
        user: setupUser, password: setupPassword });
    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await connection.changeUser({ database: config.database });
        await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
            version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL,
            applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB`);
        for (const [version, file] of MIGRATIONS) {
            const sql = await readFile(new URL(file, import.meta.url), 'utf8');
            const checksum = createHash('sha256').update(sql).digest('hex');
            const [rows] = await connection.execute('SELECT checksum FROM schema_migrations WHERE version = ?', [version]);
            if (rows.length && rows[0].checksum !== checksum) {
                throw new Error('Schema đã thay đổi sau khi áp dụng. Cần migration mới, không sửa schema cũ.');
            }
            if (!rows.length) {
                if (version === '001_initial') {
                    const [existing] = await connection.query("SHOW TABLES LIKE 'users'");
                    if (existing.length) throw new Error('Database có bảng users nhưng thiếu migration. Không ghi đè; kiểm tra database hoặc dùng DB_NAME mới.');
                }
                if (version === '003_exchange_history') {
                    // Bảng tạo tay trước khi có migration không có user_id: giữ lại dữ liệu dưới tên khác, không xóa.
                    const [legacy] = await connection.query("SHOW TABLES LIKE 'exchange_history'");
                    if (legacy.length) {
                        await connection.query('RENAME TABLE exchange_history TO exchange_history_legacy');
                        console.log('Đã đổi tên bảng exchange_history cũ (không có user_id) thành exchange_history_legacy.');
                    }
                }
                for (const statement of sql.replace(/^\s*--.*$/gm, '').split(';').filter((part) => part.trim())) {
                    await connection.query(statement);
                }
                await connection.execute('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [version, checksum]);
            }
        }
        // Provision only new accounts: never overwrite existing passwords/privileges.
        const host = '127.0.0.1';
        const [users] = await connection.execute('SELECT User FROM mysql.user WHERE User = ? AND Host = ?', [config.user, host]);
        if (!users.length) {
            await connection.query('CREATE USER ?@? IDENTIFIED BY ?', [config.user, host, config.password]);
            await connection.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON \`${config.database}\`.* TO ?@?`, [config.user, host]);
        }
        const app = await mysql.createConnection(config);
        await app.query('SELECT id FROM users LIMIT 1');
        await app.end();
        console.log(`Database ${config.database} sẵn sàng. Dữ liệu hiện có được giữ nguyên.`);
    } finally { await connection.end(); }
}

main().catch((error) => {
    console.error(error && typeof error === 'object' && 'code' in error
        ? `Không thể tạo database (${error.code}). Kiểm tra quyền của DB_SETUP_USER và cấu hình .env.local.`
        : error instanceof Error ? error.message : 'Không thể tạo database.');
    process.exitCode = 1;
});
