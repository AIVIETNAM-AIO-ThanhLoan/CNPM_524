import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, date, HttpError, jsonBody, money, text, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const goals = await rows<RowDataPacket>(`SELECT g.id, g.name, g.target_amount AS targetAmount, g.due_on AS dueOn, g.status,
            COALESCE((SELECT SUM(e.amount) FROM transaction_entries e WHERE e.account_id = g.account_id AND e.user_id = g.user_id), 0)
            + COALESCE((SELECT SUM(c.amount) FROM goal_contributions c WHERE c.goal_id = g.id AND c.user_id = g.user_id), 0) AS savedAmount
            FROM goals g WHERE g.user_id = ?
            ORDER BY g.due_on IS NULL, g.due_on, g.name`, [user.id]);
        return Response.json({ goals });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        if (body.id) {
            const id = uuid(body.id);
            const status = body.status;
            if (status !== 'active' && status !== 'achieved' && status !== 'closed') throw new HttpError(400, 'Trạng thái mục tiêu không hợp lệ.');
            await atomic(async (connection) => {
                const [owned] = await connection.execute<RowDataPacket[]>('SELECT id FROM goals WHERE user_id = ? AND id = ? FOR UPDATE', [user.id, id]);
                if (!owned.length) throw new HttpError(404, 'Không tìm thấy mục tiêu của bạn.');
                await connection.execute("UPDATE goals SET status = ?, closed_at = IF(? = 'active', NULL, UTC_TIMESTAMP()) WHERE user_id = ? AND id = ?", [status, status, user.id, id]);
            });
            return Response.json({ id });
        }
        const name = text(body.name, 'Tên mục tiêu', 100);
        const targetAmount = money(body.targetAmount);
        const dueOn = body.dueOn === undefined || body.dueOn === null || body.dueOn === '' ? null : date(body.dueOn);
        const id = randomUUID();
        await atomic(async (connection) => {
            // Mỗi mục tiêu có tài khoản sổ cái riêng (kind = 'goal'), dùng chung id với mục tiêu
            await connection.execute('INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, ?)', [id, user.id, `Mục tiêu: ${id}`, 'goal']);
            await connection.execute('INSERT INTO goals (id, user_id, account_id, name, target_amount, due_on) VALUES (?, ?, ?, ?, ?, ?)',
                [id, user.id, id, name, targetAmount, dueOn]);
        });
        return Response.json({ id }, { status: 201 });
    });
}
