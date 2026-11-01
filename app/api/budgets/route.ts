import { randomUUID } from 'node:crypto';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, rows } from '@/app/lib/db';
import { api, date, HttpError, jsonBody, money, uuid } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { sumBudgetAmounts } from '@/app/lib/budget-money';
import { budgetAlerts } from '@/app/lib/notification-jobs.mjs';

// Tháng dạng YYYY-MM, trả về ngày đầu tháng để lưu vào bảng budgets
function monthStart(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) throw new HttpError(400, 'Tháng không hợp lệ (dạng YYYY-MM).');
    return date(`${value}-01`);
}

export async function GET(request: Request) {
    return api(async () => {
        const user = await requireUser();
        const month = monthStart(new URL(request.url).searchParams.get('month'));
        const budgets = await rows<RowDataPacket>(`SELECT b.category_id AS categoryId, c.name, b.amount,
            COALESCE((SELECT SUM(IF(t.reverses_id IS NULL, t.amount, -t.amount)) FROM transactions t WHERE t.user_id = b.user_id
                AND t.category_id = b.category_id AND t.kind = 'expense' AND t.booked_on >= b.month_start
                AND t.booked_on < DATE_ADD(b.month_start, INTERVAL 1 MONTH)), 0) AS spent
            FROM budgets b JOIN categories c ON c.id = b.category_id AND c.user_id = b.user_id
            WHERE b.user_id = ? AND b.month_start = ? ORDER BY c.name`, [user.id, month]);
        return Response.json({ budgets, totalAmount: sumBudgetAmounts(budgets.map((budget) => budget.amount)) });
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
        await atomic(async (connection) => {
            await connection.execute('SELECT id FROM users WHERE id = ? FOR UPDATE', [user.id]);
            const [categories] = await connection.execute<RowDataPacket[]>("SELECT id FROM categories WHERE id = ? AND user_id = ? AND kind = 'expense' AND archived = FALSE", [categoryId, user.id]);
            if (!categories.length) throw new HttpError(400, 'Chỉ đặt ngân sách cho danh mục chi tiêu đang sử dụng của bạn.');
            await connection.execute(`INSERT INTO budgets (id, user_id, category_id, month_start, amount) VALUES (?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE amount = VALUES(amount)`, [randomUUID(), user.id, categoryId, month, amount]);
            await budgetAlerts(connection, user.id);
        });
        return Response.json({ categoryId, month: month.slice(0, 7), amount }, { status: 201 });
    });
}
