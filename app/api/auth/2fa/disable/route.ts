import type { RowDataPacket } from 'mysql2/promise';
import { atomic } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { assertPassword, requireUser } from '@/app/lib/session';
import { codeInput, consumeSecondFactor } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Tắt 2FA cần cả mật khẩu và mã (TOTP hoặc mã dự phòng)
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        await assertPassword(user.id, body.password);
        const code = codeInput(body.code);
        const ok = await atomic(async (connection) => {
            const [found] = await connection.execute<RowDataPacket[]>('SELECT id, totp_secret, totp_last_step, totp_enabled FROM users WHERE id = ? FOR UPDATE', [user.id]);
            if (!found[0].totp_enabled) throw new HttpError(409, 'Xác thực hai bước chưa bật.');
            if (!await consumeSecondFactor(connection, { id: user.id, totp_secret: found[0].totp_secret, totp_last_step: found[0].totp_last_step }, code)) return false;
            await connection.execute('UPDATE users SET totp_enabled = FALSE, totp_secret = NULL, totp_last_step = NULL WHERE id = ?', [user.id]);
            await connection.execute('DELETE FROM totp_recovery_codes WHERE user_id = ?', [user.id]);
            await connection.execute('DELETE FROM login_challenges WHERE user_id = ?', [user.id]);
            return true;
        });
        if (!ok) throw new HttpError(400, 'Mã xác thực không đúng.');
        return Response.json({ message: 'Đã tắt xác thực hai bước.' });
    });
}
