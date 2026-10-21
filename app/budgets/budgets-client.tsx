'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Pencil, Plus, Wallet } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { type Category, requestJson } from '../lib/client-api';
import { formatBudgetMoney } from '../lib/budget-money';
import '../styles/budgets.css';

type Budget = { categoryId: string; name: string; amount: string };
type BudgetResponse = { budgets: Budget[]; totalAmount: string };
type Snapshot = BudgetResponse & { key: string; categories: Category[]; error: string };

export default function Budgets({ initialMonth }: { initialMonth: string }) {
    const [month, setMonth] = useState(initialMonth);
    const [revision, setRevision] = useState(0);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const key = `${month}:${revision}`;
    const ready = snapshot?.key === key;
    const data = ready ? snapshot : null;

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            requestJson<{ categories: Category[] }>('/api/categories', undefined, controller.signal),
            requestJson<BudgetResponse>(`/api/budgets?month=${month}`, undefined, controller.signal),
        ]).then(([options, budgets]) => {
            if (!controller.signal.aborted) setSnapshot({ key, ...budgets, categories: options.categories.filter((c) => c.kind === 'expense'), error: '' });
        }).catch((error) => {
            if (!controller.signal.aborted) setSnapshot({ key, budgets: [], totalAmount: '0.00', categories: [], error: error instanceof Error ? error.message : 'Không thể tải ngân sách.' });
        });
        return () => controller.abort();
    }, [key, month]);

    function changeMonth(value: string) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < '1000-01' || value > '9999-12' || busy) return;
        setMonth(value); setEditing(null); setError(''); setNotice('');
    }

    function shiftMonth(delta: number) {
        const date = new Date(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + delta, 1);
        changeMonth(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
    }

    async function save(event: React.FormEvent<HTMLFormElement>, category: Category) {
        event.preventDefault();
        if (busy) return;
        setBusy(true); setError(''); setNotice('');
        try {
            await requestJson('/api/budgets', { categoryId: category.id, month, amount });
            const budgets = await requestJson<BudgetResponse>(`/api/budgets?month=${month}`);
            setSnapshot((current) => current?.key === key ? { ...current, ...budgets } : current);
            setEditing(null);
            setNotice(`Đã lưu ngân sách cho ${category.name}.`);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu ngân sách.'); }
        finally { setBusy(false); }
    }

    return <main className="app-page budgets-page">
        <header className="page-header budgets-header"><h1 className="page-title">Ngân sách</h1></header>
        <section className="budget-total-card" aria-label="Tổng ngân sách">
            <span className="budget-total-label">Tổng ngân sách tháng {Number(month.slice(5))}/{month.slice(0, 4)}</span>
            <strong className="budget-total" data-testid="budget-total" aria-live="polite">{data && !data.error ? formatBudgetMoney(data.totalAmount) : '—'}</strong>
            <p>Tự động cộng từ ngân sách của từng danh mục.</p>
            {data && !data.error && <span className="budget-count">Đã đặt cho {data.budgets.length}/{data.categories.length} danh mục</span>}
        </section>
        <div className="budget-month-controls">
            <button type="button" className="icon-btn" aria-label="Tháng trước" disabled={busy || month === '1000-01'} onClick={() => shiftMonth(-1)}><ChevronLeft size={21} /></button>
            <label><span>Tháng áp dụng</span><input type="month" aria-label="Chọn tháng ngân sách" value={month} min="1000-01" max="9999-12" disabled={busy} onChange={(event) => changeMonth(event.target.value)} /></label>
            <button type="button" className="icon-btn" aria-label="Tháng sau" disabled={busy || month === '9999-12'} onClick={() => shiftMonth(1)}><ChevronRight size={21} /></button>
        </div>
        {!ready && <p className="data-status" role="status">Đang tải ngân sách…</p>}
        {data?.error && <div className="budget-feedback" role="alert"><p>{data.error}</p><Link href="/login">Đăng nhập</Link><button type="button" className="btn-secondary" onClick={() => setRevision((n) => n + 1)}>Thử lại</button></div>}
        {error && <p className="budget-feedback budget-error" role="alert">{error}</p>}
        {notice && <p className="budget-feedback" role="status">{notice}</p>}
        {data && !data.error && <section className="budget-categories" aria-labelledby="budget-categories-title">
            <div className="budget-section-heading"><h2 id="budget-categories-title">Danh mục</h2></div>
            <p className="budget-section-description">Dùng chung danh mục chi tiêu với Ghi giao dịch.</p>
            {!data.categories.length && <div className="budget-empty"><Wallet size={32} /><p>Chưa có danh mục chi tiêu.</p><Link href="/transactions/new">Mở Ghi giao dịch để thêm danh mục</Link></div>}
            <div className="budget-category-grid">{data.categories.map((category) => {
                const budget = data.budgets.find((item) => item.categoryId === category.id);
                return <article key={category.id} className="budget-category-card" aria-label={category.name}>
                    <div className="budget-category-title"><span className="budget-category-icon"><Wallet size={20} aria-hidden="true" /></span><h3>{category.name}</h3></div>
                    <p className={`budget-category-amount ${budget ? '' : 'is-unset'}`}>{budget ? formatBudgetMoney(budget.amount) : 'Chưa đặt ngân sách'}</p>
                    {editing === category.id ? <form className="ledger-form budget-editor" onSubmit={(event) => save(event, category)}>
                        <label>Số tiền (VND)<input name="amount" aria-label={`Ngân sách cho ${category.name}`} type="number" inputMode="decimal" min="0.01" max="999999999999.99" step="0.01" required autoFocus value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></label>
                        <div className="budget-editor-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Hủy</button><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ngân sách'}</button></div>
                    </form> : <button type="button" className="budget-set-button" disabled={busy} onClick={() => { setEditing(category.id); setAmount(budget?.amount || ''); setError(''); setNotice(''); }}>
                        {budget ? <Pencil size={15} /> : <Plus size={16} />}{budget ? 'Sửa ngân sách' : 'Đặt ngân sách'}
                    </button>}
                </article>;
            })}</div>
        </section>}
        <BottomNav />
    </main>;
}
