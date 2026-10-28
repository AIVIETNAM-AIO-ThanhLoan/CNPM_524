import { api, jsonBody } from '@/app/lib/http';
import { destroySession } from '@/app/lib/session';
import { getCurrentUser } from '@/app/lib/session';
import { database } from '@/app/lib/db';
import { createHash } from 'node:crypto';

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await getCurrentUser();
        if (user && typeof body.endpoint === 'string') await database().execute('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [user.id, createHash('sha256').update(body.endpoint).digest('hex')]);
        await destroySession();
        return Response.json({ message: 'Đã đăng xuất.' });
    });
}
