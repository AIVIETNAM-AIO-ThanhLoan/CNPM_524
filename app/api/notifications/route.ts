import type { RowDataPacket } from 'mysql2/promise';
import { database, rows } from '@/app/lib/db';
import { api, jsonBody, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        const userId = (await requireUser()).id;
        const items = await rows<RowDataPacket>(`SELECT id, kind, title, body, created_at AS time, read_at IS NOT NULL AS \`read\`
            FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 200`, [userId]);
        const [counts] = await rows<RowDataPacket>('SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL', [userId]);
        return Response.json({ items: items.map((item) => ({ ...item, read: Boolean(item.read) })), unread: counts.unread });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const id = body.id === 'all' ? null : uuid(body.id);
        await database().execute(`UPDATE notifications SET read_at = COALESCE(read_at, UTC_TIMESTAMP()) WHERE user_id = ?${id ? ' AND id = ?' : ''}`, id ? [userId, id] : [userId]);
        return Response.json({ success: true });
    });
}
