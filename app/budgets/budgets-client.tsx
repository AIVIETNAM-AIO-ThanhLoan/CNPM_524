'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Ellipsis, Pencil, Plus, Trash2, Wallet } from 'lucide-react';
import AddCategoryButton from '../components/AddCategoryButton';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';
import BottomNav from '../components/BottomNav';
import { type Category, requestJson } from '../lib/client-api';
import { formatBudgetMoney } from '../lib/budget-money';
import { notifyFinanceUpdated } from '../lib/finance-updates';
import '../styles/budgets.css';

type Budget = { categoryId: string; name: string; amount: string; spent: string };
type BudgetResponse = { budgets: Budget[]; totalAmount: string };
type Snapshot = BudgetResponse & { key: string; categories: Category[]; error: string };

export default function Budgets({ initialMonth }: { initialMonth: string }) {
    const [month, setMonth] = useState(initialMonth);
    const [revision, setRevision] = useState(0);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [openMenu, setOpenMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [amount, setAmount] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const key = `${month}:${revision}`;
    const ready = snapshot?.key === key;
    const data = ready ? snapshot : null;

    useEffect(() => {
        if (!openMenu) return;
        function closeOutside(event: PointerEvent) {
            if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpenMenu(null);
        }
        function closeOnEscape(event: KeyboardEvent) {
            if (event.key !== 'Escape') return;
            menuRef.current?.querySelector<HTMLButtonElement>('.budget-menu-toggle')?.focus();
            setOpenMenu(null);
        }
        document.addEventListener('pointerdown', closeOutside);
        document.addEventListener('keydown', closeOnEscape);
        return () => {
            document.removeEventListener('pointerdown', closeOutside);
            document.removeEventListener('keydown', closeOnEscape);
        };
    }, [openMenu]);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            requestJson<{ categories: Category[] }>('/api/categories?all=1', undefined, controller.signal),
            requestJson<BudgetResponse>(`/api/budgets?month=${month}`, undefined, controller.signal),
        ]).then(([options, budgets]) => {
            if (!controller.signal.aborted) setSnapshot({ key, ...budgets, categories: options.categories.filter((c) => c.kind === 'expense' && (!c.archived || budgets.budgets.some((b) => b.categoryId === c.id))), error: '' });
        }).catch((error) => {
            if (!controller.signal.aborted) setSnapshot({ key, budgets: [], totalAmount: '0.00', categories: [], error: error instanceof Error ? error.message : 'Không thể tải ngân sách.' });
        });
        return () => controller.abort();
    }, [key, month]);

    function changeMonth(value: string) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) || value < '1000-01' || value > '9999-12' || busy) return;
        setMonth(value); setEditing(null); setOpenMenu(null); setError(''); setNotice('');
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
            const saved = await requestJson<{ amount: string }>('/api/budgets', { categoryId: category.id, month, amount });
            notifyFinanceUpdated();
            const budgets = await requestJson<BudgetResponse>(`/api/budgets?month=${month}`);
            setSnapshot((current) => current?.key === key ? { ...current, ...budgets } : current);
            setEditing(null);
            setNotice(saved.amount === '0.00' ? `Đã bỏ đặt ngân sách cho ${category.name}.` : `Đã lưu ngân sách cho ${category.name}.`);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu ngân sách.'); }
        finally { setBusy(false); }
    }

    function editBudget(category: Category, budget?: Budget) {
        setOpenMenu(null); setEditing(category.id); setAmount(budget?.amount || ''); setError(''); setNotice('');
    }

    async function removeCategory(category: Category) {
        if (busy) return;
        setBusy(true); setOpenMenu(null); setEditing(null); setError(''); setNotice('');
        try {
            const response = await fetch('/api/categories', {
                method: 'DELETE', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: category.id }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Không thể xóa danh mục.');
            setRevision((current) => current + 1);
            notifyFinanceUpdated();
            setNotice(`Đã xóa danh mục ${category.name}.`);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể xóa danh mục.'); }
        finally { setBusy(false); }
    }

    return <main className="app-page budgets-page">
        <section className="budget-total-card" aria-label="Tổng ngân sách">
            <h1>Ngân sách</h1>
            <strong className="budget-total" data-testid="budget-total" aria-label="Tổng ngân sách" aria-live="polite">{data && !data.error ? formatBudgetMoney(data.totalAmount) : '—'}</strong>
        </section>
        <div className="budget-month-controls">
            <button type="button" className="icon-btn" aria-label="Tháng trước" disabled={busy || month === '1000-01'} onClick={() => shiftMonth(-1)}><ChevronLeft size={21} /></button>
            <label><input type="month" aria-label="Chọn tháng ngân sách" value={month} min="1000-01" max="9999-12" disabled={busy} onChange={(event) => changeMonth(event.target.value)} /></label>
            <button type="button" className="icon-btn" aria-label="Tháng sau" disabled={busy || month === '9999-12'} onClick={() => shiftMonth(1)}><ChevronRight size={21} /></button>
        </div>
        {!ready && <><SkeletonStatus label="Đang tải ngân sách…" /><div className="skeleton-grid skeleton-page-block">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={150} style={{ borderRadius: 16 }} />)}</div></>}
        {data?.error && <div className="budget-feedback" role="alert"><p>{data.error}</p><Link href="/login">Đăng nhập</Link><button type="button" className="btn-secondary" onClick={() => setRevision((n) => n + 1)}>Thử lại</button></div>}
        {error && <p className="budget-feedback budget-error" role="alert">{error}</p>}
        {notice && <p className="budget-feedback" role="status">{notice}</p>}
        {data && !data.error && <section className="budget-categories" aria-labelledby="budget-categories-title">
            <div className="budget-section-heading">
                <h2 id="budget-categories-title">Danh mục</h2>
                <AddCategoryButton kind="expense" disabled={busy} onAdded={(category) => {
                    setSnapshot((current) => current ? { ...current, categories: [...current.categories, category] } : current);
                    setNotice(`Đã thêm danh mục ${category.name}.`);
                }} />
            </div>
            {!data.categories.length && <div className="budget-empty"><Wallet size={32} /><p>Chưa có danh mục chi tiêu.</p><Link href="/transactions/new">Mở Ghi giao dịch để thêm danh mục</Link></div>}
            <p className="budget-auto-note">Tự động dùng lại hạn mức khi sang tháng mới.</p>
            <div className="budget-category-grid">{data.categories.map((category) => {
                const budget = data.budgets.find((item) => item.categoryId === category.id);
                const usage = budget ? Math.max(0, Number(budget.spent) / Number(budget.amount) * 100) : 0;
                return <article key={category.id} className={`budget-category-card${budget && usage >= 100 ? ' is-full' : ''}${!budget ? ' is-unset' : ''}${editing === category.id ? ' is-editing' : ''}`} aria-label={category.name}>
                    <svg className="budget-border" aria-hidden="true">
                        <rect className="budget-border-track" x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="14" />
                        {budget && <rect className="budget-border-fill" x="2" y="2" width="calc(100% - 4px)" height="calc(100% - 4px)" rx="14" pathLength="100" strokeDasharray={`${Math.min(100, usage)} 100`} />}
                    </svg>
                    <div className="budget-category-heading">
                        <div className="budget-category-title"><h3>{category.name}</h3></div>
                        <div className="budget-card-menu" ref={openMenu === category.id ? menuRef : undefined}
                            onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null); }}>
                            <button type="button" className="budget-menu-toggle" aria-label={`Tùy chọn danh mục ${category.name}`}
                                aria-expanded={openMenu === category.id} aria-controls={`budget-menu-${category.id}`} disabled={busy}
                                onClick={() => setOpenMenu((current) => current === category.id ? null : category.id)}>
                                <Ellipsis size={22} aria-hidden="true" />
                            </button>
                            {openMenu === category.id && <div id={`budget-menu-${category.id}`} className="budget-menu-options" role="group" aria-label={`Thao tác danh mục ${category.name}`}>
                                <button type="button" className="budget-menu-delete" disabled={busy} onClick={() => removeCategory(category)}><Trash2 size={16} aria-hidden="true" />Xóa</button>
                                <button type="button" disabled={busy} onClick={() => editBudget(category, budget)}><Pencil size={16} aria-hidden="true" />Sửa</button>
                            </div>}
                        </div>
                    </div>
                    {Boolean(category.archived) && <p>Đã lưu trữ</p>}
                    {budget ? <>
                        <div className="budget-spending">
                            <p className="budget-category-amount" aria-label={`Đã chi ${formatBudgetMoney(budget.spent)}`}>{formatBudgetMoney(budget.spent)}</p>
                            <span aria-label={`Hạn mức ${formatBudgetMoney(budget.amount)}`}>/ {formatBudgetMoney(budget.amount)}</span>
                        </div>
                        <div className="budget-usage" role="progressbar" aria-label={`Mức sử dụng ngân sách ${category.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, usage)} aria-valuetext={`${Math.round(usage)}%`}>
                            <strong>{Math.round(usage)}<small>%</small></strong>
                        </div>
                    </> : null}
                    {editing === category.id ? <form className="ledger-form budget-editor" onSubmit={(event) => save(event, category)}>
                        <label>Số tiền (VND)<input name="amount" aria-label={`Ngân sách cho ${category.name}`} type="number" inputMode="decimal" min="0" max="999999999999.99" step="0.01" required autoFocus value={amount} disabled={busy} onChange={(event) => setAmount(event.target.value)} /></label>
                        <div className="budget-editor-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Hủy</button><button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu ngân sách'}</button></div>
                    </form> : !budget && <button type="button" className="budget-set-button" disabled={busy} onClick={() => editBudget(category)}>
                        <Plus size={16} aria-hidden="true" />Đặt ngân sách
                    </button>}
                </article>;
            })}</div>
        </section>}
        <BottomNav />
    </main>;
}
