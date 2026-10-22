import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody, uuid } from '@/app/lib/http';
import { requireAdmin } from '@/app/lib/session';

// Danh sách người dùng, tìm theo tên hoặc tài khoản (?q=); không trả mật khẩu băm hay secret 2FA
export async function GET(request: Request) {
    return api(async () => {
        await requireAdmin();
        const q = (new URL(request.url).searchParams.get('q') ?? '').slice(0, 100);
        const like = `%${q.replace(/[=%_]/g, '=$&')}%`;
        const users = await rows<RowDataPacket>(`SELECT id, name, account, role, blocked, totp_enabled AS twoFactor, created_at AS createdAt
            FROM users WHERE name LIKE ? ESCAPE '=' OR account LIKE ? ESCAPE '='
            ORDER BY created_at DESC, id LIMIT 200`, [like, like]);
        return Response.json({ users: users.map((u) => ({ ...u, blocked: Boolean(u.blocked), twoFactor: Boolean(u.twoFactor) })) });
    });
}

// Khóa / mở khóa: {userId, blocked}. Không tự khóa mình và không khóa quản trị viên khác.
// Khóa sẽ thu hồi mọi phiên đăng nhập của người đó (trigger trong migration 002).
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const admin = await requireAdmin();
        const userId = uuid(body.userId);
        if (typeof body.blocked !== 'boolean') throw new HttpError(400, 'Trạng thái khóa không hợp lệ.');
        const blocked = body.blocked;
        if (userId === admin.id) throw new HttpError(400, 'Không thể tự khóa tài khoản của mình.');
        await atomic(async (connection) => {
            const [found] = await connection.execute<RowDataPacket[]>('SELECT role FROM users WHERE id = ? FOR UPDATE', [userId]);
            if (!found[0]) throw new HttpError(404, 'Không tìm thấy người dùng.');
            if (found[0].role === 'admin') throw new HttpError(403, 'Không thể khóa quản trị viên.');
            await connection.execute('UPDATE users SET blocked = ? WHERE id = ?', [blocked, userId]);
        });
        return Response.json({ message: blocked ? 'Đã khóa người dùng.' : 'Đã mở khóa người dùng.' });
    });
}
