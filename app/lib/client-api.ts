export async function requestJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, body === undefined ? { cache: 'no-store', signal } : {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.');
    return data as T;
}

export type Wallet = { id: string; name: string; currency: string; balance: string; sourceKey?: string | null };
export type Category = { id: string; name: string; kind: 'income' | 'expense'; archived?: boolean | number };
export type Transaction = { id: string; kind: 'income' | 'expense' | 'transfer'; amount: string; bookedOn: string; note: string; category: string | null; wallet: string; target: string | null; walletId: string; categoryId: string | null; targetId: string | null; reversesId: string | null; replacesId: string | null; reversed: boolean | number; reason: string };
export type Finance = { daily: { date: string; income: string; expense: string }[]; income: number; expense: number; budget: number; budgetAmount: number; budgetSpent: number; transactions: Transaction[]; hasMore: boolean; breakdown: { name: string; kind: 'income' | 'expense'; amount: string }[] };
export const emptyFinance: Finance = { daily: [], income: 0, expense: 0, budget: 0, budgetAmount: 0, budgetSpent: 0, transactions: [], hasMore: false, breakdown: [] };

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
// Database trả thời điểm UTC dạng 'YYYY-MM-DD HH:MM:SS'; hiển thị theo giờ Việt Nam, ví dụ '13:47 03/11/2026'.
export const formatDateTime = (utc: string) => {
    const date = new Date(`${utc.replace(' ', 'T')}Z`);
    return Number.isNaN(date.getTime()) ? utc : new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
};
// Ngày lịch 'YYYY-MM-DD' (không có múi giờ) → 'DD/MM/YYYY'.
export const formatDate = (day: string) => /^\d{4}-\d{2}-\d{2}$/.test(day) ? day.split('-').reverse().join('/') : day;
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// Số tiền VND dạng '1.500.000đ'; dùng chung để mọi màn hình hiển thị giống nhau.
export const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
