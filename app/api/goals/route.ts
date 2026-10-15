import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { database, rows } from '@/app/lib/db';
import { api, date, jsonBody, money, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const goals = await rows<RowDataPacket>(`SELECT id, name, target_amount AS targetAmount, due_on AS dueOn
            FROM goals WHERE user_id = ? ORDER BY due_on IS NULL, due_on, name`, [user.id]);
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
        await database().execute('INSERT INTO goals (id, user_id, name, target_amount, due_on) VALUES (?, ?, ?, ?, ?)',
            [id, user.id, name, targetAmount, dueOn]);
        return Response.json({ id }, { status: 201 });
    });
}
