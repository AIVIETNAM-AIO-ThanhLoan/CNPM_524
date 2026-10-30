import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { atomic, database, rows } from '@/app/lib/db';
import { api, HttpError, imageBody, jsonBody, text, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

const MAX_IMAGES = 10;

// Khóa dòng users để các thao tác đổi ảnh chính của cùng một người chạy lần lượt.
async function lockUser(connection: PoolConnection, userId: string) {
    await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
}

// Không có id: danh sách ảnh. Có id: trả về nội dung ảnh.
export async function GET(request: Request) {
    return api(async () => {
        const userId = (await requireUser()).id;
        const id = new URL(request.url).searchParams.get('id');
        if (id === null) {
            return Response.json({ images: await rows<RowDataPacket>(
                'SELECT id, label, is_primary AS isPrimary, updated_at AS updatedAt FROM receive_qr_images WHERE user_id = ? ORDER BY is_primary DESC, created_at DESC, id', [userId]) });
        }
        const [image] = await rows<RowDataPacket>('SELECT mime, data FROM receive_qr_images WHERE user_id = ? AND id = ?', [userId, uuid(id)]);
        if (!image) throw new HttpError(404, 'Không tìm thấy ảnh QR.');
        return new Response(new Uint8Array(image.data), { headers: { 'Content-Type': image.mime, 'X-Content-Type-Options': 'nosniff' } });
    });
}

// Thêm ảnh: thân yêu cầu là file ảnh, tên ảnh nằm trong ?label=. Ảnh đầu tiên tự thành ảnh chính.
export async function POST(request: Request) {
    return api(async () => {
        const image = await imageBody(request);
        const userId = (await requireUser()).id;
        const label = text(new URL(request.url).searchParams.get('label') ?? '', 'Tên ảnh', 60);
        const id = await atomic(async (connection) => {
            await lockUser(connection, userId);
            const [[count]] = await connection.execute<RowDataPacket[]>(
                'SELECT COUNT(*) AS n, COALESCE(MAX(is_primary), 0) AS hasPrimary FROM receive_qr_images WHERE user_id = ?', [userId]);
            if (count.n >= MAX_IMAGES) throw new HttpError(400, `Chỉ lưu tối đa ${MAX_IMAGES} ảnh QR. Hãy xóa bớt ảnh cũ.`);
            const id = randomUUID();
            await connection.execute('INSERT INTO receive_qr_images (id, user_id, label, mime, data, is_primary) VALUES (?, ?, ?, ?, ?, ?)',
                [id, userId, label, image.mime, image.data, count.hasPrimary ? 0 : 1]);
            return id;
        });
        return Response.json({ id }, { status: 201 });
    });
}

// Thay ảnh: giữ nguyên tên và trạng thái ảnh chính, chỉ đổi nội dung ảnh.
export async function PUT(request: Request) {
    return api(async () => {
        const image = await imageBody(request);
        const userId = (await requireUser()).id;
        const id = uuid(new URL(request.url).searchParams.get('id'));
        const [found] = await rows<RowDataPacket>('SELECT id FROM receive_qr_images WHERE user_id = ? AND id = ?', [userId, id]);
        if (!found) throw new HttpError(404, 'Không tìm thấy ảnh QR.');
        await database().execute('UPDATE receive_qr_images SET mime = ?, data = ? WHERE user_id = ? AND id = ?', [image.mime, image.data, userId, id]);
        return Response.json({ id });
    });
}

// Đổi tên hoặc đặt làm ảnh chính.
export async function PATCH(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const id = uuid(body.id);
        const label = body.label === undefined ? null : text(body.label, 'Tên ảnh', 60);
        await atomic(async (connection) => {
            await lockUser(connection, userId);
            const [found] = await connection.execute<RowDataPacket[]>('SELECT id FROM receive_qr_images WHERE user_id = ? AND id = ?', [userId, id]);
            if (!found.length) throw new HttpError(404, 'Không tìm thấy ảnh QR.');
            if (label !== null) await connection.execute('UPDATE receive_qr_images SET label = ? WHERE user_id = ? AND id = ?', [label, userId, id]);
            if (body.primary === true) await connection.execute('UPDATE receive_qr_images SET is_primary = (id = ?) WHERE user_id = ?', [id, userId]);
        });
        return Response.json({ id });
    });
}

// Xóa ảnh; nếu xóa ảnh chính thì ảnh mới nhất còn lại thành ảnh chính.
export async function DELETE(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const id = uuid(body.id);
        await atomic(async (connection) => {
            await lockUser(connection, userId);
            const [found] = await connection.execute<RowDataPacket[]>('SELECT is_primary FROM receive_qr_images WHERE user_id = ? AND id = ?', [userId, id]);
            if (!found.length) throw new HttpError(404, 'Không tìm thấy ảnh QR.');
            await connection.execute('DELETE FROM receive_qr_images WHERE user_id = ? AND id = ?', [userId, id]);
            if (found[0].is_primary) {
                await connection.execute('UPDATE receive_qr_images SET is_primary = TRUE WHERE user_id = ? ORDER BY created_at DESC, id LIMIT 1', [userId]);
            }
        });
        return Response.json({ id });
    });
}
