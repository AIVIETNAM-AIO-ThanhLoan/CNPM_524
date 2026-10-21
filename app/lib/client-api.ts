export async function requestJson<T>(url: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const response = await fetch(url, body === undefined ? { cache: 'no-store', signal } : {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.');
    return data as T;
}

export type Wallet = { id: string; name: string; currency: string; balance: string };
export type Category = { id: string; name: string; kind: 'income' | 'expense' };
export type Transaction = { id: string; kind: 'income' | 'expense' | 'transfer'; amount: string; bookedOn: string; note: string; category: string | null; wallet: string; target: string | null };
export type Finance = { income: number; expense: number; budget: number; budgetAmount: number; budgetSpent: number; transactions: Transaction[]; breakdown: { name: string; kind: 'income' | 'expense'; amount: string }[] };
export const emptyFinance: Finance = { income: 0, expense: 0, budget: 0, budgetAmount: 0, budgetSpent: 0, transactions: [], breakdown: [] };

export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
