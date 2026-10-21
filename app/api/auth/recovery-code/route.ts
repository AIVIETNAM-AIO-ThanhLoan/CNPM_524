import { database } from '@/app/lib/db';
import { api, jsonBody } from '@/app/lib/http';
import { assertPassword, requireUser } from '@/app/lib/session';
import { hashRecoveryCode, newRecoveryCode } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Tạo mã khôi phục mật khẩu mới (mã cũ hết hiệu lực), cần nhập lại mật khẩu
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        await assertPassword(user.id, body.password);
        const recoveryCode = newRecoveryCode(4);
        await database().execute('UPDATE users SET recovery_code_hash = ?, recovery_code_created_at = UTC_TIMESTAMP() WHERE id = ?',
            [hashRecoveryCode(recoveryCode), user.id]);
        return Response.json({ recoveryCode });
    });
}
