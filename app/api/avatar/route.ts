import type { RowDataPacket } from 'mysql2/promise';
import { database, rows } from '@/app/lib/db';
import { api, HttpError, imageBody, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const [image] = await rows<RowDataPacket>('SELECT mime, data FROM user_avatars WHERE user_id = ?', [user.id]);
        if (!image) throw new HttpError(404, 'Bạn chưa có ảnh đại diện.');
        return new Response(new Uint8Array(image.data), {
            headers: { 'Content-Type': image.mime, 'X-Content-Type-Options': 'nosniff' },
        });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const user = await requireUser();
        const image = await imageBody(request);
        await database().execute(`INSERT INTO user_avatars (user_id, mime, data) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data)`, [user.id, image.mime, image.data]);
        return Response.json({ message: 'Đã lưu ảnh đại diện.' });
    });
}

export async function DELETE(request: Request) {
    return api(async () => {
        await jsonBody(request);
        const user = await requireUser();
        await database().execute('DELETE FROM user_avatars WHERE user_id = ?', [user.id]);
        return Response.json({ message: 'Đã xóa ảnh đại diện.' });
    });
}
