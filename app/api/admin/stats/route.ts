import type { RowDataPacket } from 'mysql2/promise';
import { rows } from '@/app/lib/db';
import { api } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/session';

// Số liệu thật cho trang quản trị: người dùng, giao dịch, tỷ giá đã lưu và các lần sao lưu gần nhất
export async function GET() {
    return api(async () => {
        await requireAdmin();
        const [users, transactions, rates, backups] = await Promise.all([
            rows<RowDataPacket>(`SELECT COUNT(*) AS total, COALESCE(SUM(blocked), 0) AS blocked, COALESCE(SUM(role = 'admin'), 0) AS admins,
                COALESCE(SUM(totp_enabled), 0) AS twoFactor FROM users`),
            rows<RowDataPacket>(`SELECT COUNT(*) AS total,
                COALESCE(SUM(created_at >= UTC_TIMESTAMP() - INTERVAL 30 DAY), 0) AS last30Days FROM transactions`),
            rows<RowDataPacket>('SELECT COUNT(*) AS total, MAX(rate_date) AS lastRateDate FROM exchange_rates'),
            rows<RowDataPacket>(`SELECT id, trigger_type AS triggerType, status, started_at AS startedAt, finished_at AS finishedAt,
                file_path AS filePath, size_bytes AS sizeBytes, checksum, error
                FROM backup_runs ORDER BY started_at DESC, id DESC LIMIT 10`),
        ]);
        return Response.json({
            users: { total: Number(users[0].total), blocked: Number(users[0].blocked), admins: Number(users[0].admins), twoFactor: Number(users[0].twoFactor) },
            transactions: { total: Number(transactions[0].total), last30Days: Number(transactions[0].last30Days) },
            exchangeRates: { total: Number(rates[0].total), lastRateDate: rates[0].lastRateDate },
            backups: backups.map((b) => ({ ...b, sizeBytes: b.sizeBytes === null ? null : Number(b.sizeBytes) })),
        });
    });
}
