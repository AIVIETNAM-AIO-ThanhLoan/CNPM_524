import type { RowDataPacket } from 'mysql2/promise';
import { rows } from '@/app/lib/db';
import { api } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

// Trạng thái 2FA của người đang đăng nhập và số mã dự phòng còn dùng được
export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const [state] = await rows<RowDataPacket>(`SELECT u.totp_enabled AS enabled,
            (SELECT COUNT(*) FROM totp_recovery_codes r WHERE r.user_id = u.id AND r.used_at IS NULL) AS backupCodesLeft
            FROM users u WHERE u.id = ?`, [user.id]);
        return Response.json({ enabled: Boolean(state.enabled), backupCodesLeft: Number(state.backupCodesLeft) });
    });
}
