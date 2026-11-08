import { randomUUID } from 'node:crypto';

// Caller owns the transaction. A marker preserves deliberate removals, including an empty month.
export async function rolloverBudgets(connection, userId, month) {
    await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
    const [done] = await connection.execute('SELECT month_start FROM budget_rollovers WHERE user_id = ? AND month_start = ?', [userId, month]);
    if (done.length) return;
    const [source] = await connection.execute(`SELECT MAX(month_start) AS month FROM (
        SELECT month_start FROM budgets WHERE user_id = ? AND month_start < ?
        UNION ALL SELECT month_start FROM budget_rollovers WHERE user_id = ? AND month_start < ?
    ) months`, [userId, month, userId, month]);
    if (source[0]?.month) {
        const [previous] = await connection.execute(`SELECT b.category_id, b.amount FROM budgets b
            JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
            WHERE b.user_id = ? AND b.month_start = ? AND c.kind = 'expense' AND c.archived = FALSE
            AND NOT EXISTS (SELECT 1 FROM budgets dest WHERE dest.user_id = b.user_id
                AND dest.category_id = b.category_id AND dest.month_start = ?)`, [userId, source[0].month, month]);
        for (const budget of previous) {
            await connection.execute('INSERT INTO budgets (id, user_id, category_id, month_start, amount) VALUES (?, ?, ?, ?, ?)',
                [randomUUID(), userId, budget.category_id, month, budget.amount]);
        }
    }
    await connection.execute('INSERT INTO budget_rollovers (user_id, month_start) VALUES (?, ?)', [userId, month]);
}
