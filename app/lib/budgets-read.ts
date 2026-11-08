import type { RowDataPacket } from 'mysql2/promise';
import { rows } from './db';

export async function readBudgets(userId: string, month: string) {
    const budgets = await rows<RowDataPacket>(`SELECT b.category_id AS categoryId, c.name, b.amount,
            COALESCE((SELECT SUM(IF(t.reverses_id IS NULL, t.amount, -t.amount)) FROM transactions t WHERE t.user_id = b.user_id
                AND t.category_id = b.category_id AND t.kind = 'expense' AND t.booked_on >= b.month_start
                AND t.booked_on < DATE_ADD(b.month_start, INTERVAL 1 MONTH)), 0) AS spent
            FROM budgets b JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
            WHERE b.user_id = ? AND b.month_start = ? ORDER BY c.name`, [userId, month]);
    return budgets;
}
