import type { RowDataPacket } from 'mysql2/promise';
import { rows } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { accountInput, assertNotThrottled, clearFailures, passwordInput, recordFailure } from '@/app/lib/auth-input';
import { createSession, verifyPassword } from '@/app/lib/session';

export const runtime = 'nodejs';
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const account = accountInput(body.account);
        const password = passwordInput(body.password);
        const key = `login:${account}`;
        assertNotThrottled(key);
        const users = await rows<RowDataPacket>('SELECT id, password_hash, blocked FROM users WHERE account = ?', [account]);
        // Also perform password work for nonexistent accounts.
        const hash = users[0]?.password_hash || `scrypt:${'0'.repeat(32)}:${'0'.repeat(128)}`;
        const valid = await verifyPassword(password, hash);
        if (!valid || !users[0] || users[0].blocked) {
            recordFailure(key);
            throw new HttpError(401, 'Tài khoản hoặc mật khẩu không đúng.');
        }
        clearFailures(key);
        await createSession(users[0].id);
        return Response.json({ message: 'Đăng nhập thành công.' });
    });
}
