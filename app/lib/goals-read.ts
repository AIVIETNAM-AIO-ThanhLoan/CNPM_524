import type { RowDataPacket } from 'mysql2/promise';
import { rows } from './db';

export async function readGoals(userId: string) {
    const goals = await rows<RowDataPacket>(`SELECT g.id, g.name, g.target_amount AS targetAmount, g.due_on AS dueOn, g.status,
            COALESCE((SELECT SUM(e.amount) FROM transaction_entries e WHERE e.account_id = g.account_id AND e.user_id = g.user_id), 0)
            + COALESCE((SELECT SUM(c.amount) FROM goal_contributions c WHERE c.goal_id = g.id AND c.user_id = g.user_id), 0) AS savedAmount
            FROM goals g WHERE g.user_id = ?
            ORDER BY g.due_on IS NULL, g.due_on, g.name`, [userId]);
    return goals;
}
