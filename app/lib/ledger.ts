import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from './db';
import { date, HttpError, money, text, uuid } from './http';

export async function seedUser(connection: PoolConnection, userId: string): Promise<void> {
    for (const name of ['Tiền mặt', 'Ngân hàng']) {
        await connection.execute('INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, ?)', [randomUUID(), userId, name, 'wallet']);
    }
    for (const [name, kind] of [['Lương', 'income'], ['Thu khác', 'income'], ['Ăn uống', 'expense'], ['Đi lại', 'expense'], ['Tiền nhà', 'expense'], ['Chi khác', 'expense']]) {
        const accountId = randomUUID();
        await connection.execute('INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, ?)', [accountId, userId, `Danh mục: ${name}`, kind]);
        await connection.execute('INSERT INTO categories (id, user_id, account_id, name, kind) VALUES (?, ?, ?, ?, ?)', [randomUUID(), userId, accountId, name, kind]);
    }
}

export async function wallets(userId: string) {
    return rows<RowDataPacket & { id: string; name: string; currency: string; balance: string }>(`SELECT a.id, a.name, a.currency,
        COALESCE(SUM(e.amount), 0) AS balance
        FROM accounts a LEFT JOIN transaction_entries e ON e.account_id = a.id AND e.user_id = a.user_id
        WHERE a.user_id = ? AND a.kind = 'wallet' GROUP BY a.id, a.name, a.currency ORDER BY a.created_at, a.id`, [userId]);
}

export async function categories(userId: string) {
    return rows<RowDataPacket>('SELECT id, name, kind FROM categories WHERE user_id = ? ORDER BY kind, name', [userId]);
}

export async function postTransaction(userId: string, body: Record<string, unknown>): Promise<string> {
    const kind = body.kind;
    if (kind !== 'income' && kind !== 'expense' && kind !== 'transfer') throw new HttpError(400, 'Loại giao dịch không hợp lệ.');
    const amount = money(body.amount);
    const bookedOn = date(body.bookedOn);
    const note = text(body.note ?? '', 'Ghi chú', 500, false);
    const walletId = uuid(body.walletId);
    const requestKey = uuid(body.requestKey);
    const categoryId = kind === 'transfer' ? null : uuid(body.categoryId);
    const targetId = kind === 'transfer' ? uuid(body.targetId) : null;
    if (targetId === walletId) throw new HttpError(400, 'Hai ví chuyển tiền phải khác nhau.');
    return atomic(async (connection) => {
        // Lock wallets in stable order to serialize concurrent postings.
        const ids = targetId ? [walletId, targetId].sort() : [walletId];
        for (const id of ids) {
            const [owned] = await connection.execute<RowDataPacket[]>("SELECT id FROM accounts WHERE id = ? AND user_id = ? AND kind = 'wallet' FOR UPDATE", [id, userId]);
            if (!owned.length) throw new HttpError(404, 'Không tìm thấy ví của bạn.');
        }
        let counterpart = targetId;
        if (categoryId) {
            const [owned] = await connection.execute<RowDataPacket[]>('SELECT account_id FROM categories WHERE id = ? AND user_id = ? AND kind = ?', [categoryId, userId, kind]);
            if (!owned.length) throw new HttpError(400, 'Danh mục không phù hợp hoặc không thuộc tài khoản của bạn.');
            counterpart = owned[0].account_id;
        }
        const id = randomUUID();
        await connection.execute(`INSERT INTO transactions (id, user_id, kind, amount, booked_on, note, category_id, request_key)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [id, userId, kind, amount, bookedOn, note, categoryId, requestKey]);
        const walletAmount = kind === 'income' ? amount : `-${amount}`;
        const otherAmount = kind === 'income' ? `-${amount}` : amount;
        await connection.execute(`INSERT INTO transaction_entries (user_id, transaction_id, account_id, amount)
            VALUES (?, ?, ?, ?), (?, ?, ?, ?)`, [userId, id, walletId, walletAmount, userId, id, counterpart, otherAmount]);
        return id;
    });
}

export async function finance(userId: string, start: string, end: string, search = '') {
    const scope = [userId, start, end];
    const totals = await rows<RowDataPacket>(`SELECT
        COALESCE(SUM(CASE WHEN kind = 'income' THEN amount ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN kind = 'expense' THEN amount ELSE 0 END), 0) AS expense
        FROM transactions WHERE user_id = ? AND booked_on BETWEEN ? AND ?`, scope);
    const transactions = await rows<RowDataPacket>(`SELECT t.id, t.kind, t.amount, t.booked_on AS bookedOn, t.note,
        c.name AS category, a.name AS wallet, b.name AS target
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        JOIN transaction_entries e ON e.transaction_id = t.id AND e.user_id = t.user_id
        JOIN accounts a ON a.id = e.account_id AND a.kind = 'wallet'
        LEFT JOIN transaction_entries e2 ON e2.transaction_id = t.id AND e2.account_id <> a.id AND e2.user_id = t.user_id
        LEFT JOIN accounts b ON b.id = e2.account_id AND b.kind = 'wallet'
        WHERE t.user_id = ? AND t.booked_on BETWEEN ? AND ? AND (t.kind <> 'transfer' OR e.amount < 0)
        AND (t.note LIKE ? ESCAPE '=' OR c.name LIKE ? ESCAPE '=' OR a.name LIKE ? ESCAPE '=')
        ORDER BY t.booked_on DESC, t.created_at DESC, t.id DESC LIMIT 200`,
        [...scope, ...Array(3).fill(`%${search.replace(/[=%_]/g, '=$&')}%`)]);
    const breakdown = await rows<RowDataPacket>(`SELECT c.name, t.kind, SUM(t.amount) AS amount
        FROM transactions t JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        WHERE t.user_id = ? AND t.booked_on BETWEEN ? AND ? GROUP BY c.id, c.name, t.kind ORDER BY amount DESC`, scope);
    const budgetRows = await rows<RowDataPacket>('SELECT COALESCE(SUM(amount), 0) AS amount FROM budgets WHERE user_id = ? AND month_start = ?', [userId, `${start.slice(0, 7)}-01`]);
    const spentRows = await rows<RowDataPacket>(`SELECT COALESCE(SUM(t.amount), 0) AS amount FROM transactions t
        JOIN budgets b ON b.user_id = t.user_id AND b.category_id = t.category_id AND b.month_start = ?
        WHERE t.user_id = ? AND t.kind = 'expense' AND t.booked_on BETWEEN ? AND ?`, [`${start.slice(0, 7)}-01`, ...scope]);
    const budgetAmount = Number(budgetRows[0].amount);
    const budgetSpent = Number(spentRows[0].amount);
    return { income: Number(totals[0].income), expense: Number(totals[0].expense),
        budget: budgetAmount ? Math.round(budgetSpent / budgetAmount * 100) : 0,
        budgetAmount, budgetSpent, transactions, breakdown };
}
