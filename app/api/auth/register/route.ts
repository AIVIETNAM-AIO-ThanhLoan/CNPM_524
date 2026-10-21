import { randomUUID } from 'node:crypto';
import { atomic } from '@/app/lib/db';
import { api, jsonBody, text } from '@/app/lib/http';
import { accountInput, assertNotThrottled, passwordInput, recordFailure } from '@/app/lib/auth-input';
import { hashPassword } from '@/app/lib/session';
import { seedUser } from '@/app/lib/ledger';
import { hashRecoveryCode, newRecoveryCode } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const name = text(body.name, 'Họ tên', 100);
        const account = accountInput(body.account);
        const password = passwordInput(body.password);
        assertNotThrottled(`register:${account}`);
        recordFailure(`register:${account}`);
        const hash = await hashPassword(password);
        const id = randomUUID();
        // Mã khôi phục mật khẩu chỉ trả về một lần, database chỉ giữ SHA-256
        const recoveryCode = newRecoveryCode(4);
        await atomic(async (connection) => {
            await connection.execute(`INSERT INTO users (id, name, account, password_hash, recovery_code_hash, recovery_code_created_at)
                VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP())`, [id, name, account, hash, hashRecoveryCode(recoveryCode)]);
            await seedUser(connection, id);
        });
        return Response.json({ message: 'Tạo tài khoản thành công. Bạn có thể đăng nhập.', recoveryCode }, { status: 201 });
    });
}
