import { randomUUID } from 'node:crypto';

export const vietnamToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function nextDue(due, frequency, anchorDay, anchorMonth) {
    const current = new Date(`${due}T12:00:00Z`);
    if (frequency === 'weekly') current.setUTCDate(current.getUTCDate() + 7);
    else {
        const year = current.getUTCFullYear() + (frequency === 'yearly' ? 1 : 0);
        const month = frequency === 'yearly' ? anchorMonth - 1 : current.getUTCMonth() + 1;
        const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        current.setUTCDate(1);
        current.setUTCFullYear(year, month, Math.min(anchorDay, last));
    }
    return current.toISOString().slice(0, 10);
}

export async function notify(connection, userId, eventKey, kind, title, body) {
    await connection.execute(`INSERT INTO notifications (id, user_id, event_key, kind, title, body)
        VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`, [randomUUID(), userId, eventKey, kind, title, body]);
}

export async function budgetAlerts(connection, userId) {
    const [budgets] = await connection.execute(`SELECT b.*, c.name,
        COALESCE((SELECT SUM(IF(t.reverses_id IS NULL, t.amount, -t.amount)) FROM transactions t
            WHERE t.user_id = b.user_id AND t.category_id = b.category_id AND t.kind = 'expense'
            AND t.booked_on >= b.month_start AND t.booked_on < DATE_ADD(b.month_start, INTERVAL 1 MONTH)), 0) AS spent
        FROM budgets b JOIN categories c ON c.user_id = b.user_id AND c.id = b.category_id WHERE b.user_id = ?`, [userId]);
    for (const budget of budgets) {
        for (const threshold of [80, 100]) {
            // Compare integer cents, including the exact threshold boundary.
            const cents = (amount) => BigInt(String(amount).replace('.', ''));
            if (cents(budget.spent) * 100n < cents(budget.amount) * BigInt(threshold)) continue;
            await connection.execute(`INSERT INTO budget_alerts (user_id, category_id, month_start, threshold, budget_amount, spent_amount)
                VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE id = id`,
            [userId, budget.category_id, budget.month_start, threshold, budget.amount, budget.spent]);
            await notify(connection, userId, `budget:${budget.category_id}:${budget.month_start}:${threshold}`, 'budget',
                `Ngân sách ${budget.name} đã đạt ${threshold}%`, `Chi tiêu đã chạm ngưỡng ${threshold}% ngân sách tháng ${budget.month_start.slice(0, 7)}.`);
        }
    }
}

export async function reminderJobs(connection, today = vietnamToday()) {
    const [items] = await connection.execute(`SELECT r.* FROM recurring_transactions r JOIN users u ON u.id = r.user_id
        WHERE r.enabled = TRUE AND u.blocked = FALSE AND r.next_due_on <= ? ORDER BY r.user_id, r.id`, [today]);
    for (const item of items) {
        await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [item.user_id]);
        const [current] = await connection.execute('SELECT enabled, next_due_on FROM recurring_transactions WHERE user_id = ? AND id = ? FOR UPDATE', [item.user_id, item.id]);
        if (!current[0]?.enabled || current[0].next_due_on !== item.next_due_on) continue;
        await connection.execute(`INSERT INTO reminder_deliveries (user_id, recurring_id, due_on, remind_on, status, sent_at)
            VALUES (?, ?, ?, ?, 'sent', UTC_TIMESTAMP()) ON DUPLICATE KEY UPDATE id = id`, [item.user_id, item.id, item.next_due_on, item.next_due_on]);
        await notify(connection, item.user_id, `recurring:${item.id}:${item.next_due_on}`, 'reminder',
            `Đến hạn: ${item.name}`, `Hạn ${item.next_due_on}. Xác nhận đã thanh toán trong Lời nhắc để ghi giao dịch.`);
    }
}
