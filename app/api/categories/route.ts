import { randomUUID } from 'node:crypto';
import { atomic } from '@/app/lib/db';
import { api, HttpError, jsonBody, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { categories } from '@/app/lib/ledger';

export async function GET() {
    return api(async () => Response.json({ categories: await categories((await requireUser()).id) }));
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
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
