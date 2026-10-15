import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { database, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody, money, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

// Tháng dạng YYYY-MM, trả về ngày đầu tháng để lưu vào bảng budgets
function monthStart(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new HttpError(400, 'Tháng không hợp lệ (dạng YYYY-MM).');
    return `${value}-01`;
}

export async function GET(request: Request) {
    return api(async () => {
        const user = await requireUser();
        const month = monthStart(new URL(request.url).searchParams.get('month'));
        const budgets = await rows<RowDataPacket>(`SELECT b.category_id AS categoryId, c.name, b.amount
            FROM budgets b JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
            WHERE b.user_id = ? AND b.month_start = ? ORDER BY c.name`, [user.id, month]);
        return Response.json({ budgets });
    });
}

// Đặt hoặc cập nhật hạn mức của một danh mục chi tiêu trong một tháng
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        const categoryId = uuid(body.categoryId);
        const month = monthStart(body.month);
        const amount = money(body.amount);
        const [category] = await rows<RowDataPacket>("SELECT id FROM categories WHERE id = ? AND user_id = ? AND kind = 'expense'", [categoryId, user.id]);
        if (!category) throw new HttpError(400, 'Chỉ đặt ngân sách cho danh mục chi tiêu của bạn.');
        await database().execute(`INSERT INTO budgets (id, user_id, category_id, month_start, amount) VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE amount = VALUES(amount)`, [randomUUID(), user.id, categoryId, month, amount]);
        return Response.json({ categoryId, month: month.slice(0, 7), amount }, { status: 201 });
    });
}
