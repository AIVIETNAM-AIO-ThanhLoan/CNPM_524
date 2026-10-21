import type { ResultSetHeader } from 'mysql2/promise';
import { database } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { assertPassword, requireUser } from '@/app/lib/session';
import { newTotpSecret, otpauthUrl } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Bước 1 bật 2FA: tạo secret mới (chưa có hiệu lực) để người dùng quét vào ứng dụng xác thực
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        await assertPassword(user.id, body.password);
        const secret = newTotpSecret();
        const [updated] = await database().execute<ResultSetHeader>(
            'UPDATE users SET totp_secret = ?, totp_last_step = NULL WHERE id = ? AND totp_enabled = FALSE', [secret, user.id]);
        if (!updated.affectedRows) throw new HttpError(409, 'Xác thực hai bước đang bật.');
        return Response.json({ secret, otpauthUrl: otpauthUrl(user.account, secret) });
    });
}
