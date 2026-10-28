import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, date, HttpError, jsonBody, money, text, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { postTransaction } from '@/app/lib/ledger';
import { budgetAlerts, nextDue, vietnamToday } from '@/app/lib/notification-jobs.mjs';

export async function GET() {
    return api(async () => Response.json({ recurring: await rows<RowDataPacket>(`SELECT r.id, r.name, r.account_id AS walletId,
        r.category_id AS categoryId, r.amount, r.next_due_on AS nextDueOn, r.frequency, r.enabled, a.name AS wallet, c.name AS category
        FROM recurring_transactions r JOIN accounts a ON a.user_id = r.user_id AND a.id = r.account_id
        JOIN categories c ON c.user_id = r.user_id AND c.id = r.category_id WHERE r.user_id = ? ORDER BY r.next_due_on, r.id`, [(await requireUser()).id]) }));
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const id = body.id ? uuid(body.id) : randomUUID();
        const result = await atomic(async (connection) => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
            const [owned] = await connection.execute<RowDataPacket[]>('SELECT * FROM recurring_transactions WHERE user_id = ? AND id = ? FOR UPDATE', [userId, id]);
            if (body.id && !owned.length) throw new HttpError(404, 'Không tìm thấy khoản định kỳ của bạn.');
            if (body.action === 'confirm') {
                const dueOn = date(body.dueOn);
                const requestKey = uuid(body.requestKey);
                const [paid] = await connection.execute<RowDataPacket[]>(`SELECT p.transaction_id, t.request_key FROM recurring_payments p
                    JOIN transactions t ON t.user_id = p.user_id AND t.id = p.transaction_id
                    WHERE p.user_id = ? AND p.recurring_id = ? AND p.due_on = ?`, [userId, id, dueOn]);
                if (paid.length) {
                    if (paid[0].request_key !== requestKey) throw new HttpError(409, 'Kỳ này đã ghi thanh toán.');
                    return { id, transactionId: paid[0].transaction_id };
                }
                const item = owned[0];
                if (!item || !item.enabled || item.next_due_on !== dueOn || dueOn > vietnamToday()) throw new HttpError(409, 'Khoản định kỳ chưa đến hạn hoặc đã thay đổi.');
                const transactionId = await postTransaction(userId, { kind: 'expense', amount: item.amount, walletId: item.account_id,
                    categoryId: item.category_id, bookedOn: vietnamToday(), note: `${item.name} · kỳ ${dueOn}`, requestKey }, connection);
                const next = nextDue(dueOn, item.frequency, item.anchor_day, item.anchor_month);
                if (next > '9999-12-31') throw new HttpError(400, 'Ngày tiếp theo vượt phạm vi hỗ trợ.');
                await connection.execute('INSERT INTO recurring_payments (user_id, recurring_id, due_on, transaction_id) VALUES (?, ?, ?, ?)', [userId, id, dueOn, transactionId]);
                await connection.execute('UPDATE recurring_transactions SET next_due_on = ? WHERE user_id = ? AND id = ?', [next, userId, id]);
                await connection.execute('UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP()) WHERE user_id = ? AND event_key = ?', [userId, `recurring:${id}:${dueOn}`]);
                await budgetAlerts(connection, userId);
                return { id, transactionId };
            }
            if (body.action === 'toggle') {
                if (!owned.length || typeof body.enabled !== 'boolean') throw new HttpError(400, 'Trạng thái không hợp lệ.');
                await connection.execute('UPDATE recurring_transactions SET enabled = ? WHERE user_id = ? AND id = ?', [body.enabled, userId, id]);
                return { id };
            }
            const name = text(body.name, 'Tên khoản định kỳ', 100);
            const walletId = uuid(body.walletId);
            const categoryId = uuid(body.categoryId);
            const amount = money(body.amount);
            const due = date(body.nextDueOn);
            const frequency = text(body.frequency, 'Chu kỳ', 10);
            if (!['weekly', 'monthly', 'yearly'].includes(frequency)) throw new HttpError(400, 'Chu kỳ không hợp lệ.');
            const [wallet] = await connection.execute<RowDataPacket[]>("SELECT id FROM accounts WHERE user_id = ? AND id = ? AND kind = 'wallet' AND archived = FALSE", [userId, walletId]);
            const [category] = await connection.execute<RowDataPacket[]>("SELECT id FROM categories WHERE user_id = ? AND id = ? AND kind = 'expense' AND archived = FALSE", [userId, categoryId]);
            if (!wallet.length || !category.length) throw new HttpError(400, 'Ví hoặc danh mục chi không còn hoạt động.');
            if (owned.length) {
                const [paidDate] = await connection.execute<RowDataPacket[]>('SELECT due_on FROM recurring_payments WHERE user_id = ? AND recurring_id = ? AND due_on = ?', [userId, id, due]);
                if (paidDate.length) throw new HttpError(409, 'Kỳ này đã ghi thanh toán. Hãy chọn ngày đến hạn khác.');
                const preserveAnchor = owned[0].next_due_on === due && owned[0].frequency === frequency;
                await connection.execute(`UPDATE recurring_transactions SET name = ?, account_id = ?, category_id = ?, amount = ?,
                    next_due_on = ?, frequency = ?, anchor_day = ?, anchor_month = ? WHERE user_id = ? AND id = ?`,
                [name, walletId, categoryId, amount, due, frequency, preserveAnchor ? owned[0].anchor_day : Number(due.slice(8)), preserveAnchor ? owned[0].anchor_month : Number(due.slice(5, 7)), userId, id]);
            } else await connection.execute(`INSERT INTO recurring_transactions (id, user_id, name, account_id, category_id, amount, next_due_on, frequency, anchor_day, anchor_month)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, userId, name, walletId, categoryId, amount, due, frequency, Number(due.slice(8)), Number(due.slice(5, 7))]);
            return { id };
        });
        return Response.json(result, { status: 201 });
    });
}
