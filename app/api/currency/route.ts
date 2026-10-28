import type { RowDataPacket } from 'mysql2/promise';
import { database, rows } from '@/app/lib/db';
import { api, HttpError, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';

// Mã tiền tệ ISO 4217: ba chữ in hoa, dùng làm một phần URL nên phải kiểm tra trước khi gọi API tỷ giá
function currency(value: unknown, label: string): string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) throw new HttpError(400, `${label} không hợp lệ.`);
  return value;
}

function positive(value: unknown, label: string, max: number): number {
  const number = typeof value === 'string' && value.trim() ? Number(value) : value;
  if (typeof number !== 'number' || !Number.isFinite(number) || number <= 0 || number > max) {
    throw new HttpError(400, `${label} phải lớn hơn 0 và không quá ${max.toLocaleString('vi-VN')}.`);
  }
  return number;
}

export async function GET(request: Request) {
  return api(async () => {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'rate') {
      const from = currency(searchParams.get('from') || 'USD', 'Tiền tệ nguồn');
      const to = currency(searchParams.get('to') || 'VND', 'Tiền tệ đích');
      if (from === to) return Response.json({ success: true, rate: 1 });
      try {
        const res = await fetch(`https://open.er-api.com/v6/latest/${from}`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) });
        const data = await res.json();
        if (res.ok && data.result === 'success' && typeof data.rates?.[to] === 'number' && Number.isFinite(data.rates[to]) && data.rates[to] > 0) {
          return Response.json({ success: true, rate: data.rates[to] });
        }
      } catch { /* Nhà cung cấp tỷ giá không khả dụng. */ }
      throw new HttpError(502, 'Không lấy được tỷ giá.');
    }

    if (action === 'history') {
      // Lịch sử chỉ thuộc về người đang đăng nhập; user_id lấy từ session, không nhận từ client
      const user = await requireUser();
      const history = await rows<RowDataPacket>(`SELECT id, from_currency, to_currency, amount, result, rate_used, created_at
        FROM exchange_history WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 5`, [user.id]);
      return Response.json({ success: true, history });
    }

    throw new HttpError(400, 'Yêu cầu không hợp lệ.');
  });
}

export async function POST(request: Request) {
  return api(async () => {
    const body = await jsonBody(request);
    const user = await requireUser();
    const from = currency(body.from, 'Tiền tệ nguồn');
    const to = currency(body.to, 'Tiền tệ đích');
    const amount = positive(body.amount, 'Số tiền', 1e12).toFixed(4);
    const rate = positive(body.rate, 'Tỷ giá', 1e9).toFixed(8);
    if (Number(amount) === 0 || Number(rate) === 0 || Number(amount) * Number(rate) >= 1e20) {
      throw new HttpError(400, 'Số tiền hoặc kết quả quy đổi ngoài phạm vi lưu trữ.');
    }
    // Kết quả tính lại ở server từ số tiền và tỷ giá áp dụng, không tin giá trị client gửi lên
    await database().execute(`INSERT INTO exchange_history (user_id, from_currency, to_currency, amount, result, rate_used)
      VALUES (?, ?, ?, ?, ROUND(CAST(? AS DECIMAL(20,4)) * CAST(? AS DECIMAL(24,8)), 4), ?)`,
    [user.id, from, to, amount, amount, rate, rate]);
    return Response.json({ success: true }, { status: 201 });
  });
}
