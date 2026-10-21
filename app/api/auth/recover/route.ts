import type { RowDataPacket } from 'mysql2/promise';
import { atomic } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { accountInput, assertNotThrottled, clearFailures, passwordInput, recordFailure } from '@/app/lib/auth-input';
import { hashPassword } from '@/app/lib/session';
import { codeInput, hashRecoveryCode, newRecoveryCode } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Đặt lại mật khẩu bằng mã khôi phục. Mã cũ bị thay ngay nên chỉ dùng được một lần;
// mọi phiên đăng nhập cũ bị thu hồi. Không cho biết tài khoản có tồn tại hay không.
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const account = accountInput(body.account);
        const code = codeInput(body.recoveryCode);
        const password = passwordInput(body.password);
        const key = `recover:${account}`;
        assertNotThrottled(key);
        // Băm mật khẩu trước khi tra tài khoản để thời gian phản hồi như nhau
        const hash = await hashPassword(password);
        const recoveryCode = newRecoveryCode(4);
        const ok = await atomic(async (connection) => {
            const [found] = await connection.execute<RowDataPacket[]>(
                'SELECT id FROM users WHERE account = ? AND recovery_code_hash = ? AND blocked = FALSE FOR UPDATE', [account, hashRecoveryCode(code)]);
            if (!found[0]) return false;
            await connection.execute(`UPDATE users SET password_hash = ?, recovery_code_hash = ?, recovery_code_created_at = UTC_TIMESTAMP()
                WHERE id = ?`, [hash, hashRecoveryCode(recoveryCode), found[0].id]);
            await connection.execute('DELETE FROM sessions WHERE user_id = ?', [found[0].id]);
            await connection.execute('DELETE FROM login_challenges WHERE user_id = ?', [found[0].id]);
            return true;
        });
        if (!ok) {
            recordFailure(key);
            throw new HttpError(400, 'Tài khoản hoặc mã khôi phục không đúng.');
        }
        clearFailures(key);
        clearFailures(`login:${account}`);
        return Response.json({ message: 'Đã đặt lại mật khẩu. Hãy lưu mã khôi phục mới.', recoveryCode });
    });
}
