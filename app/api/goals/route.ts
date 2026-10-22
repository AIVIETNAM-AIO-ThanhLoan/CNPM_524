import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, date, jsonBody, money, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        // Số đã tích lũy = số dư tài khoản sổ cái của mục tiêu (tiền chuyển từ ví sang, trừ phần đã rút)
        const goals = await rows<RowDataPacket>(`SELECT g.id, g.name, g.target_amount AS targetAmount, g.due_on AS dueOn, g.status,
            COALESCE(SUM(e.amount), 0) AS savedAmount
            FROM goals g LEFT JOIN transaction_entries e ON e.account_id = g.account_id AND e.user_id = g.user_id
            WHERE g.user_id = ? GROUP BY g.id, g.name, g.target_amount, g.due_on, g.status
            ORDER BY g.due_on IS NULL, g.due_on, g.name`, [user.id]);
        return Response.json({ goals });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
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
