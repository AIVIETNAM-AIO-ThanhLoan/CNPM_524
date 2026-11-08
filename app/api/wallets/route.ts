import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, database, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody, text, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { wallets } from '@/app/lib/ledger';

export async function GET(request: Request) {
    return api(async () => {
        const user = await requireUser();
        if (new URL(request.url).searchParams.get('all') === '1') return Response.json({ wallets: await rows<RowDataPacket>(`SELECT a.id, a.name, a.currency, a.archived, a.source_key AS sourceKey, COALESCE(SUM(e.amount), 0) AS balance
            FROM accounts a LEFT JOIN transaction_entries e ON e.user_id = a.user_id AND e.account_id = a.id
            WHERE a.user_id = ? AND a.kind = 'wallet' GROUP BY a.id, a.name, a.currency, a.archived, a.source_key ORDER BY a.created_at, a.id`, [user.id]) });
        return Response.json({ wallets: await wallets(user.id) });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        if (body.id) {
            const id = uuid(body.id);
            await atomic(async (connection) => {
                await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
                const [owned] = await connection.execute<RowDataPacket[]>("SELECT id FROM accounts WHERE id = ? AND user_id = ? AND kind = 'wallet' FOR UPDATE", [id, user.id]);
                if (!owned.length) throw new HttpError(404, 'Không tìm thấy ví của bạn.');
                if (body.archived !== undefined) {
                    if (typeof body.archived !== 'boolean') throw new HttpError(400, 'Trạng thái không hợp lệ.');
                    if (body.archived) {
                        const [recurring] = await connection.execute<RowDataPacket[]>('SELECT id FROM recurring_transactions WHERE user_id = ? AND account_id = ? AND enabled = TRUE LIMIT 1', [user.id, id]);
                        if (recurring.length) throw new HttpError(409, 'Hãy tạm dừng hoặc đổi ví cho khoản định kỳ trước khi lưu trữ.');
                        const [balance] = await connection.execute<RowDataPacket[]>('SELECT COALESCE(SUM(amount), 0) AS balance FROM transaction_entries WHERE user_id = ? AND account_id = ?', [user.id, id]);
                        if (Number(balance[0].balance) !== 0) throw new HttpError(409, 'Chỉ lưu trữ ví có số dư bằng 0. Hãy chuyển số dư trước.');
                    }
                    await connection.execute('UPDATE accounts SET archived = ? WHERE user_id = ? AND id = ?', [body.archived, user.id, id]);
                } else await connection.execute('UPDATE accounts SET name = ? WHERE user_id = ? AND id = ?', [text(body.name, 'Tên ví', 100), user.id, id]);
            });
            return Response.json({ id });
        }
        const id = randomUUID();
        const name = text(body.name, 'Tên ví', 100);
        await database().execute("INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, 'wallet')", [id, user.id, name]);
        return Response.json({ id }, { status: 201 });
    }, 'Tên ví này đã có. Hãy chọn tên khác.');
}
