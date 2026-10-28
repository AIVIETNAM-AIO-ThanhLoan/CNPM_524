import { createHash, createPublicKey, randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic } from '@/app/lib/db';
import { api, HttpError, jsonBody, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

export async function GET() {
    return api(async () => {
        await requireUser();
        return Response.json({ publicKey: process.env.VAPID_PUBLIC_KEY || '' });
    });
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const userId = (await requireUser()).id;
        const endpoint = text(body.endpoint, 'Push endpoint', 2048);
        let url: URL;
        try { url = new URL(endpoint); } catch { throw new HttpError(400, 'Push endpoint không hợp lệ.'); }
        // Accept only browser push services to prevent the worker making arbitrary requests.
        if (url.protocol !== 'https:' || url.username || url.password || url.port || ![
            'fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com',
            'wns2-par02p.notify.windows.com',
        ].includes(url.hostname) && !/^[a-z0-9-]+\.notify\.windows\.com$/.test(url.hostname)) throw new HttpError(400, 'Dịch vụ Push không được hỗ trợ.');
        const hash = createHash('sha256').update(endpoint).digest('hex');
        await atomic(async (connection) => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [userId]);
            if (body.action === 'unsubscribe') {
                await connection.execute('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?', [userId, hash]);
                return;
            }
            if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_SUBJECT) throw new HttpError(503, 'Máy chủ chưa cấu hình Web Push.');
            const keys = body.keys as Record<string, unknown> | undefined;
            const p256dh = text(keys?.p256dh, 'Push key', 100);
            const auth = text(keys?.auth, 'Push auth', 50);
            if (!/^[A-Za-z0-9_-]+$/.test(p256dh) || !/^[A-Za-z0-9_-]+$/.test(auth)
                || Buffer.from(p256dh, 'base64url').length !== 65 || Buffer.from(auth, 'base64url').length !== 16) throw new HttpError(400, 'Push key không hợp lệ.');
            try {
                const bytes = Buffer.from(p256dh, 'base64url');
                createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: bytes.subarray(1, 33).toString('base64url'), y: bytes.subarray(33).toString('base64url') }, format: 'jwk' });
            } catch { throw new HttpError(400, 'Push key không hợp lệ.'); }
            const [existing] = await connection.execute<RowDataPacket[]>('SELECT user_id FROM push_subscriptions WHERE endpoint_hash = ? FOR UPDATE', [hash]);
            if (existing.length && existing[0].user_id !== userId) throw new HttpError(409, 'Thiết bị đã đăng ký với tài khoản khác. Hãy tắt thông báo rồi đăng ký lại.');
            await connection.execute(`INSERT INTO push_subscriptions (id, user_id, endpoint, endpoint_hash, p256dh, auth)
                VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth)`, [randomUUID(), userId, endpoint, hash, p256dh, auth]);
        });
        return Response.json({ success: true });
    });
}
