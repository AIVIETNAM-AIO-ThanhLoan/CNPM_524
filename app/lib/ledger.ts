import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from './db';
import { date, HttpError, money, text, uuid } from './http';
import { budgetAlerts } from './notification-jobs.mjs';
import { providerSource, resolveWalletSource } from './wallet-source';

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
    return rows<RowDataPacket & { id: string; name: string; currency: string; balance: string; sourceKey: string | null }>(`SELECT a.id, a.name, a.currency, a.source_key AS sourceKey,
        COALESCE(SUM(e.amount), 0) AS balance
        FROM accounts a LEFT JOIN transaction_entries e ON e.account_id = a.id AND e.user_id = a.user_id
        WHERE a.user_id = ? AND a.kind = 'wallet' AND a.archived = FALSE GROUP BY a.id, a.name, a.currency, a.source_key ORDER BY a.created_at, a.id`, [userId]);
}

export async function categories(userId: string) {
    return rows<RowDataPacket>('SELECT id, name, kind FROM categories WHERE user_id = ? AND archived = FALSE ORDER BY kind, name', [userId]);
}

export async function postTransaction(userId: string, body: Record<string, unknown>, transactionConnection?: PoolConnection): Promise<string> {
    const kind = body.kind;
    if (kind !== 'income' && kind !== 'expense' && kind !== 'transfer') throw new HttpError(400, 'Loại giao dịch không hợp lệ.');
    const amount = money(body.amount);
    const bookedOn = date(body.bookedOn);
    const note = text(body.note ?? '', 'Ghi chú', 500, false);
    const source = providerSource(body.walletSource);
    const suppliedWalletId = source ? null : uuid(body.walletId);
    const requestKey = uuid(body.requestKey);
    const categoryId = kind === 'transfer' ? null : uuid(body.categoryId);
    const targetSource = kind === 'transfer' ? providerSource(body.targetSource) : null;
    const suppliedTargetId = kind === 'transfer' && !targetSource ? uuid(body.targetId) : null;
    const post = async (connection: PoolConnection) => {
        await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        const walletId = source ? await resolveWalletSource(connection, userId, source) : suppliedWalletId!;
        const targetId = targetSource ? await resolveWalletSource(connection, userId, targetSource) : suppliedTargetId;
        if (targetId === walletId) throw new HttpError(400, 'Hai ví chuyển tiền phải khác nhau.');
        const [existing] = await connection.execute<RowDataPacket[]>(`SELECT t.*, e.account_id AS wallet_id, e2.account_id AS target_id
            FROM transactions t JOIN transaction_entries e ON e.transaction_id = t.id AND e.user_id = t.user_id
            JOIN accounts a ON a.id = e.account_id AND a.user_id = t.user_id AND a.kind = 'wallet'
            JOIN transaction_entries e2 ON e2.transaction_id = t.id AND e2.user_id = t.user_id AND e2.account_id <> e.account_id
            WHERE t.user_id = ? AND t.request_key = ? AND (t.kind <> 'transfer' OR e.amount < 0)`, [userId, requestKey]);
        if (existing.length) {
            const saved = existing[0];
            if (!saved.reverses_id && saved.kind === kind && saved.amount === amount && saved.booked_on === bookedOn
                && saved.note === note && saved.category_id === categoryId && saved.wallet_id === walletId
                && (kind !== 'transfer' || saved.target_id === targetId)) return saved.id as string;
            throw new HttpError(409, 'Mã yêu cầu đã được dùng cho giao dịch khác.');
        }
        // Lock wallets in stable order to serialize concurrent postings.
        const ids = targetId ? [walletId, targetId].sort() : [walletId];
        for (const id of ids) {
            const [owned] = await connection.execute<RowDataPacket[]>("SELECT id FROM accounts WHERE id = ? AND user_id = ? AND kind = 'wallet' AND archived = FALSE FOR UPDATE", [id, userId]);
            if (!owned.length) throw new HttpError(404, 'Không tìm thấy ví của bạn.');
        }
        let counterpart = targetId;
        if (categoryId) {
            const [owned] = await connection.execute<RowDataPacket[]>('SELECT account_id FROM categories WHERE id = ? AND user_id = ? AND kind = ? AND archived = FALSE', [categoryId, userId, kind]);
            if (!owned.length) throw new HttpError(400, 'Danh mục không phù hợp hoặc không thuộc tài khoản của bạn.');
            counterpart = owned[0].account_id;
        }
        const id = randomUUID();
        await connection.execute(`INSERT INTO transactions (id, user_id, kind, amount, booked_on, note, category_id, request_key, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, userId, kind, amount, bookedOn, note, categoryId, requestKey, userId]);
        const walletAmount = kind === 'income' ? amount : `-${amount}`;
        const otherAmount = kind === 'income' ? `-${amount}` : amount;
        await connection.execute(`INSERT INTO transaction_entries (user_id, transaction_id, account_id, amount)
            VALUES (?, ?, ?, ?), (?, ?, ?, ?)`, [userId, id, walletId, walletAmount, userId, id, counterpart, otherAmount]);
        if (!transactionConnection) await budgetAlerts(connection, userId);
        return id;
    };
    return transactionConnection ? post(transactionConnection) : atomic(post);
}

export async function reverseTransaction(userId: string, body: Record<string, unknown>) {
    const originalId = uuid(body.id);
    const requestKey = uuid(body.requestKey);
    const reason = text(body.reason, 'Lý do', 255);
    const action = body.action;
    if (action !== 'cancel' && action !== 'correct') throw new HttpError(400, 'Thao tác không hợp lệ.');
    return atomic(async (connection) => {
        await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
        const [originals] = await connection.execute<RowDataPacket[]>('SELECT * FROM transactions WHERE user_id = ? AND id = ? FOR UPDATE', [userId, originalId]);
        const original = originals[0];
        if (!original) throw new HttpError(404, 'Không tìm thấy giao dịch của bạn.');
        if (original.reverses_id) throw new HttpError(400, 'Không thể đảo bút toán đối ứng.');
        const [reversed] = await connection.execute<RowDataPacket[]>('SELECT id, request_key, reason FROM transactions WHERE user_id = ? AND reverses_id = ?', [userId, originalId]);
        if (reversed.length) {
            const [replacement] = await connection.execute<RowDataPacket[]>('SELECT id FROM transactions WHERE user_id = ? AND replaces_id = ?', [userId, originalId]);
            if (reversed[0].request_key === requestKey && reversed[0].reason === reason && (action === 'correct') === Boolean(replacement.length)) {
                if (action === 'correct') {
                    if (!body.replacement || typeof body.replacement !== 'object' || Array.isArray(body.replacement)) throw new HttpError(400, 'Thiếu giao dịch sửa.');
                    const id = await postTransaction(userId, body.replacement as Record<string, unknown>, connection);
                    if (id !== replacement[0].id) throw new HttpError(409, 'Mã yêu cầu điều chỉnh không khớp.');
                }
                return { id: reversed[0].id, replacementId: replacement[0]?.id ?? null };
            }
            throw new HttpError(409, 'Giao dịch đã được hủy hoặc điều chỉnh.');
        }
        const [archived] = await connection.execute<RowDataPacket[]>(`SELECT a.id FROM transaction_entries e
            JOIN accounts a ON a.user_id = e.user_id AND a.id = e.account_id
            WHERE e.user_id = ? AND e.transaction_id = ? AND a.kind = 'wallet' AND a.archived = TRUE`, [userId, originalId]);
        if (archived.length) throw new HttpError(409, 'Hãy khôi phục ví liên quan trước khi hủy hoặc điều chỉnh giao dịch.');
        const id = randomUUID();
        await connection.execute(`INSERT INTO transactions (id, user_id, kind, amount, booked_on, note, category_id, request_key, reverses_id, reason, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [id, userId, original.kind, original.amount, original.booked_on, original.note, original.category_id, requestKey, originalId, reason, userId]);
        await connection.execute(`INSERT INTO transaction_entries (user_id, transaction_id, account_id, amount)
            SELECT user_id, ?, account_id, -amount FROM transaction_entries WHERE user_id = ? AND transaction_id = ?`, [id, userId, originalId]);
        let replacementId: string | null = null;
        if (action === 'correct') {
            if (!body.replacement || typeof body.replacement !== 'object' || Array.isArray(body.replacement)) throw new HttpError(400, 'Thiếu giao dịch sửa.');
            const replacement = body.replacement as Record<string, unknown>;
            const [existing] = await connection.execute<RowDataPacket[]>('SELECT id FROM transactions WHERE user_id = ? AND request_key = ?', [userId, uuid(replacement.requestKey)]);
            if (existing.length) throw new HttpError(409, 'Điều chỉnh cần mã yêu cầu mới cho giao dịch thay thế.');
            replacementId = await postTransaction(userId, replacement, connection);
            const [linked] = await connection.execute<RowDataPacket[]>('SELECT replaces_id, reverses_id FROM transactions WHERE user_id = ? AND id = ?', [userId, replacementId]);
            if (linked[0].reverses_id || linked[0].replaces_id || replacementId === originalId) throw new HttpError(409, 'Giao dịch thay thế không hợp lệ.');
            await connection.execute('UPDATE transactions SET replaces_id = ?, reason = ? WHERE user_id = ? AND id = ?', [originalId, reason, userId, replacementId]);
        }
        await budgetAlerts(connection, userId);
        return { id, replacementId };
    });
}

export async function finance(userId: string, start: string, end: string, search = '', page = 1) {
    const scope = [userId, start, end];
    const totals = await rows<RowDataPacket>(`SELECT
        COALESCE(SUM(CASE WHEN kind = 'income' THEN IF(reverses_id IS NULL, amount, -amount) ELSE 0 END), 0) AS income,
        COALESCE(SUM(CASE WHEN kind = 'expense' THEN IF(reverses_id IS NULL, amount, -amount) ELSE 0 END), 0) AS expense
        FROM transactions WHERE user_id = ? AND booked_on BETWEEN ? AND ?`, scope);
    const transactions = await rows<RowDataPacket>(`SELECT t.id, t.kind, t.amount, t.booked_on AS bookedOn, t.note,
        c.name AS category, a.name AS wallet, b.name AS target, a.id AS walletId, c.id AS categoryId, b.id AS targetId,
        t.reverses_id AS reversesId, t.replaces_id AS replacesId, t.reason,
        EXISTS(SELECT 1 FROM transactions r WHERE r.user_id = t.user_id AND r.reverses_id = t.id) AS reversed
        FROM transactions t
        LEFT JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        JOIN transaction_entries e ON e.transaction_id = t.id AND e.user_id = t.user_id
        JOIN accounts a ON a.id = e.account_id AND a.kind = 'wallet'
        LEFT JOIN transaction_entries e2 ON e2.transaction_id = t.id AND e2.account_id <> a.id AND e2.user_id = t.user_id
        LEFT JOIN accounts b ON b.id = e2.account_id AND b.kind = 'wallet'
        WHERE t.user_id = ? AND t.booked_on BETWEEN ? AND ? AND (t.kind <> 'transfer' OR IF(t.reverses_id IS NULL, e.amount < 0, e.amount > 0))
        AND (t.note LIKE ? ESCAPE '=' OR c.name LIKE ? ESCAPE '=' OR a.name LIKE ? ESCAPE '=')
        ORDER BY t.booked_on DESC, t.created_at DESC, t.id DESC LIMIT 201 OFFSET ${(page - 1) * 200}`,
        [...scope, ...Array(3).fill(`%${search.replace(/[=%_]/g, '=$&')}%`)]);
    const breakdown = await rows<RowDataPacket>(`SELECT c.name, t.kind, SUM(IF(t.reverses_id IS NULL, t.amount, -t.amount)) AS amount
        FROM transactions t JOIN categories c ON c.id = t.category_id AND c.user_id = t.user_id
        WHERE t.user_id = ? AND t.booked_on BETWEEN ? AND ? GROUP BY c.id, c.name, t.kind ORDER BY amount DESC`, scope);
    const daily = await rows<RowDataPacket>(`SELECT booked_on AS date,
        SUM(CASE WHEN kind = 'income' THEN IF(reverses_id IS NULL, amount, -amount) ELSE 0 END) AS income,
        SUM(CASE WHEN kind = 'expense' THEN IF(reverses_id IS NULL, amount, -amount) ELSE 0 END) AS expense
        FROM transactions WHERE user_id = ? AND booked_on BETWEEN ? AND ? GROUP BY booked_on`, scope);
    const budgetRows = await rows<RowDataPacket>('SELECT COALESCE(SUM(amount), 0) AS amount FROM budgets WHERE user_id = ? AND month_start = ?', [userId, `${start.slice(0, 7)}-01`]);
    const spentRows = await rows<RowDataPacket>(`SELECT COALESCE(SUM(IF(t.reverses_id IS NULL, t.amount, -t.amount)), 0) AS amount FROM transactions t
        JOIN budgets b ON b.user_id = t.user_id AND b.category_id = t.category_id AND b.month_start = ?
        WHERE t.user_id = ? AND t.kind = 'expense' AND t.booked_on >= ? AND t.booked_on < DATE_ADD(?, INTERVAL 1 MONTH)`,
        [`${start.slice(0, 7)}-01`, userId, `${start.slice(0, 7)}-01`, `${start.slice(0, 7)}-01`]);
    const budgetAmount = Number(budgetRows[0].amount);
    const budgetSpent = Number(spentRows[0].amount);
    return { income: Number(totals[0].income), expense: Number(totals[0].expense),
        budget: budgetAmount ? Math.round(budgetSpent / budgetAmount * 100) : 0,
        budgetAmount, budgetSpent, transactions: transactions.slice(0, 200), hasMore: transactions.length > 200, breakdown, daily };
}
