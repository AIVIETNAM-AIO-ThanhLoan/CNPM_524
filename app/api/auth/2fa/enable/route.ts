import type { RowDataPacket } from 'mysql2/promise';
import { atomic } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { codeInput, replaceBackupCodes, verifyTotp } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Bước 2 bật 2FA: nhập đúng mã từ ứng dụng mới bật, trả về mã dự phòng một lần duy nhất
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        const code = codeInput(body.code);
        const backupCodes = await atomic(async (connection) => {
            const [found] = await connection.execute<RowDataPacket[]>('SELECT totp_secret, totp_enabled FROM users WHERE id = ? FOR UPDATE', [user.id]);
            if (found[0].totp_enabled) throw new HttpError(409, 'Xác thực hai bước đang bật.');
            if (!found[0].totp_secret) throw new HttpError(400, 'Hãy bắt đầu cài đặt xác thực hai bước trước.');
            const step = verifyTotp(found[0].totp_secret, code, null);
            if (step === null) throw new HttpError(400, 'Mã xác thực không đúng.');
            await connection.execute('UPDATE users SET totp_enabled = TRUE, totp_last_step = ? WHERE id = ?', [step, user.id]);
            return replaceBackupCodes(connection, user.id);
        });
        return Response.json({ message: 'Đã bật xác thực hai bước.', backupCodes });
    });
}
