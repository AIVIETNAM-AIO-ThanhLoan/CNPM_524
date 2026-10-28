import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody, text, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { categories } from '@/app/lib/ledger';

export async function GET(request: Request) {
    return api(async () => {
        const user = await requireUser();
        return Response.json({ categories: new URL(request.url).searchParams.get('all') === '1'
            ? await rows<RowDataPacket>('SELECT id, name, kind, archived FROM categories WHERE user_id = ? ORDER BY kind, name', [user.id]) : await categories(user.id) });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        if (body.id) {
            const id = uuid(body.id);
            await atomic(async (connection) => {
                await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
                const [owned] = await connection.execute<RowDataPacket[]>('SELECT account_id, kind FROM categories WHERE id = ? AND user_id = ? FOR UPDATE', [id, user.id]);
                if (!owned.length) throw new HttpError(404, 'Không tìm thấy danh mục của bạn.');
                if (body.archived !== undefined) {
                    if (typeof body.archived !== 'boolean') throw new HttpError(400, 'Trạng thái không hợp lệ.');
                    if (body.archived) {
                        const [recurring] = await connection.execute<RowDataPacket[]>('SELECT id FROM recurring_transactions WHERE user_id = ? AND category_id = ? AND enabled = TRUE LIMIT 1', [user.id, id]);
                        if (recurring.length) throw new HttpError(409, 'Hãy tạm dừng hoặc đổi danh mục cho khoản định kỳ trước khi lưu trữ.');
                    }
                    await connection.execute('UPDATE categories SET archived = ? WHERE user_id = ? AND id = ?', [body.archived, user.id, id]);
                } else {
                    const name = text(body.name, 'Tên danh mục', 80);
                    await connection.execute('UPDATE categories SET name = ? WHERE user_id = ? AND id = ?', [name, user.id, id]);
                    await connection.execute('UPDATE accounts SET name = ? WHERE user_id = ? AND id = ?', [`Danh mục ${owned[0].kind}: ${name}`, user.id, owned[0].account_id]);
                }
            });
            return Response.json({ id });
        }
        const name = text(body.name, 'Tên danh mục', 80);
        const kind = body.kind;
        if (kind !== 'income' && kind !== 'expense') throw new HttpError(400, 'Loại danh mục không hợp lệ.');
        const id = randomUUID();
        const accountId = randomUUID();
        await atomic(async (connection) => {
            await connection.execute('INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, ?)', [accountId, user.id, `Danh mục ${kind}: ${name}`, kind]);
            await connection.execute('INSERT INTO categories (id, user_id, account_id, name, kind) VALUES (?, ?, ?, ?, ?)', [id, user.id, accountId, name, kind]);
        });
        return Response.json({ id }, { status: 201 });
    });
}
