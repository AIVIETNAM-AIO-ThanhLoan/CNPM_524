import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/session';
import { vietnamToday } from '@/app/lib/notification-jobs.mjs';

export async function GET() {
    return api(async () => {
        await requireAdmin();
        const rates = await rows<RowDataPacket>(`SELECT r.base_currency AS base, r.quote_currency AS quote,
            r.rate_date AS date, r.rate FROM exchange_rates r
            WHERE r.rate_date = (SELECT MAX(latest.rate_date) FROM exchange_rates latest
                WHERE latest.base_currency = r.base_currency AND latest.quote_currency = r.quote_currency)
            ORDER BY r.base_currency, r.quote_currency LIMIT 200`);
        return Response.json({ rates });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        await jsonBody(request);
        await requireAdmin();
        let data;
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
            data = await response.json();
            if (!response.ok || data.result !== 'success') throw new Error();
        } catch { throw new HttpError(502, 'Không lấy được tỷ giá. Chưa thay đổi dữ liệu đã lưu.'); }
        const bases = ['USD', 'EUR', 'JPY', 'GBP', 'CNY', 'KRW'];
        const vnd = data.rates?.VND;
        const rates = bases.filter((base) => typeof data.rates?.[base] === 'number' && data.rates[base] > 0)
            .map((base) => ({ base, rate: vnd / data.rates[base] }));
        if (typeof vnd !== 'number' || !Number.isFinite(vnd) || vnd <= 0 || !rates.length
            || rates.some(({ rate }) => !Number.isFinite(rate) || rate < 0.00000001 || rate >= 1e12)) {
            throw new HttpError(502, 'Tỷ giá nguồn không hợp lệ. Chưa thay đổi dữ liệu đã lưu.');
        }
        const date = typeof data.time_last_update_unix === 'number' && Number.isFinite(data.time_last_update_unix)
            && data.time_last_update_unix > 0 && data.time_last_update_unix < 253402300800
            ? new Date(data.time_last_update_unix * 1000).toISOString().slice(0, 10) : vietnamToday();
        await atomic(async (connection) => {
            for (const { base, rate } of rates) {
                await connection.execute(`INSERT INTO exchange_rates (base_currency, quote_currency, rate_date, rate) VALUES (?, 'VND', ?, ?)
                    ON DUPLICATE KEY UPDATE rate = VALUES(rate)`, [base, date, rate.toFixed(8)]);
            }
        });
        return Response.json({ message: `Đã lưu ${rates.length} tỷ giá ngày ${date}.` });
    });
}
