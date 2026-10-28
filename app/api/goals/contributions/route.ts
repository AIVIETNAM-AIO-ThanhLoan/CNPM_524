import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody, money, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET(request: Request) {
    return api(async () => {
        const userId = (await requireUser()).id;
        const goalId = uuid(new URL(request.url).searchParams.get('goalId'));
        const [goal] = await rows<RowDataPacket>('SELECT id FROM goals WHERE user_id = ? AND id = ?', [userId, goalId]);
        if (!goal) throw new HttpError(404, 'Không tìm thấy mục tiêu của bạn.');
        return Response.json({ contributions: await rows<RowDataPacket>('SELECT id, amount, created_at AS createdAt FROM goal_contributions WHERE user_id = ? AND goal_id = ? ORDER BY created_at DESC, id DESC', [userId, goalId]) });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const goalId = uuid(body.goalId);
        const requestKey = uuid(body.requestKey);
        const amount = money(body.amount);
        const id = await atomic(async (connection) => {
            const [goals] = await connection.execute<RowDataPacket[]>(
                'SELECT id, status FROM goals WHERE user_id = ? AND id = ? FOR UPDATE', [userId, goalId]);
            if (!goals.length) throw new HttpError(404, 'Không tìm thấy mục tiêu của bạn.');
            const [existing] = await connection.execute<RowDataPacket[]>(
                'SELECT id, goal_id, amount FROM goal_contributions WHERE user_id = ? AND request_key = ?', [userId, requestKey]);
            if (existing.length) {
                if (existing[0].goal_id === goalId && existing[0].amount === amount) return existing[0].id;
                throw new HttpError(409, 'Mã yêu cầu đã được dùng cho khoản góp khác.');
            }
            if (goals[0].status !== 'active') throw new HttpError(400, 'Mục tiêu không còn hoạt động.');
            const id = randomUUID();
            await connection.execute('INSERT INTO goal_contributions (id, user_id, goal_id, request_key, amount) VALUES (?, ?, ?, ?, ?)',
                [id, userId, goalId, requestKey, amount]);
            return id;
        });
        return Response.json({ id }, { status: 201 });
    });
}
