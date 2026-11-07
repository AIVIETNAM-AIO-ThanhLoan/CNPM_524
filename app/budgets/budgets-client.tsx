'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Ellipsis, Pencil, Plus, Trash2, Wallet, X } from 'lucide-react';
import AddCategoryButton from '../components/AddCategoryButton';
import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';
import { type Category, requestJson } from '../lib/client-api';
import { formatBudgetMoney } from '../lib/budget-money';
import { notifyFinanceUpdated } from '../lib/finance-updates';
import { PALETTE } from '../lib/colors'; // <-- Đã thêm import PALETTE
import '../styles/budgets.css';

type Budget = { categoryId: string; name: string; amount: string; spent: string };
type BudgetResponse = { budgets: Budget[]; totalAmount: string };
type Snapshot = BudgetResponse & { key: string; categories: Category[]; error: string };

export default function Budgets({ initialMonth }: { initialMonth: string }) {
    const [month, setMonth] = useState(initialMonth);
    const [revision, setRevision] = useState(0);
    const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
    const [editing, setEditing] = useState<Category | null>(null);
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
            setOpenMenu(null);
            setEditing(null);
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
        setOpenMenu(null); setEditing(category); setAmount(budget?.amount || ''); setError(''); setNotice('');
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

    const getStrokeColor = (percent: number) => {
        if (percent >= 100) return '#ef4444';
        if (percent >= 80) return '#f59e0b';
        return '#10b981';
    };

    return <main className="app-page budgets-page">
        <section className="budget-total-card" aria-label="Tổng ngân sách">
            <span className="budget-total-label">Tổng ngân sách tháng {Number(month.slice(5))}/{month.slice(0, 4)}</span>
            <strong className="budget-total" data-testid="budget-total" aria-live="polite">{data && !data.error ? formatBudgetMoney(data.totalAmount) : '—'}</strong>
            {data && !data.error && <span className="budget-count">Đã đặt cho {data.budgets.length}/{data.categories.length} danh mục</span>}
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
            
            {/* GIAO DIỆN Ô VUÔNG */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px', marginTop: '16px' }}>
                {data.categories.map((category) => {
                    const budget = data.budgets.find((item) => item.categoryId === category.id);
                    const percent = budget && Number(budget.amount) > 0 ? (Number(budget.spent) / Number(budget.amount)) * 100 : 0;
                    const displayPercent = Math.min(percent, 100);
                    
                    return (
                        <article key={category.id} style={{ position: 'relative', aspectRatio: '1/1', overflow: 'hidden' }} aria-label={category.name}>
                            
                            {/* SVG VẼ VIỀN TIẾN ĐỘ */}
                            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} viewBox="0 0 100 100">
                                <rect x="4" y="4" width="92" height="92" rx="16" ry="16" fill="#ffffff" stroke="#f3f4f6" strokeWidth="8" />
                                {budget && (
                                    <rect
                                        x="4" y="4" width="92" height="92" rx="16" ry="16"
                                        fill="none" stroke={getStrokeColor(percent)} strokeWidth="8"
                                        pathLength="100"
                                        strokeDasharray="100"
                                        strokeDashoffset={100 - displayPercent}
                                        style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
                                        strokeLinecap="round"
                                    />
                                )}
                            </svg>

                            {/* NỘI DUNG BÊN TRONG */}
                            <div style={{ position: 'absolute', inset: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, textAlign: 'center' }}>
                                
                                <div className="budget-card-menu" style={{ position: 'absolute', top: 0, right: 0 }} ref={openMenu === category.id ? menuRef : undefined}
                                    onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpenMenu(null); }}>
                                    <button type="button" className="budget-menu-toggle" aria-label={`Tùy chọn danh mục ${category.name}`}
                                        aria-expanded={openMenu === category.id} aria-controls={`budget-menu-${category.id}`} disabled={busy}
                                        onClick={() => setOpenMenu((current) => current === category.id ? null : category.id)}>
                                        <Ellipsis size={20} aria-hidden="true" />
                                    </button>
                                    {openMenu === category.id && <div id={`budget-menu-${category.id}`} className="budget-menu-options" role="group" aria-label={`Thao tác danh mục ${category.name}`}>
                                        <button type="button" className="budget-menu-delete" disabled={busy} onClick={() => removeCategory(category)}><Trash2 size={16} aria-hidden="true" />Xóa</button>
                                        <button type="button" disabled={busy} onClick={() => editBudget(category, budget)}><Pencil size={16} aria-hidden="true" />Sửa</button>
                                    </div>}
                                </div>

                                <span style={{ backgroundColor: `${PALETTE.teal}24`, color: PALETTE.teal, width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px' }}>
                                    <Wallet size={16} />
                                </span>
                                
                                <h3 style={{ fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{category.name}</h3>
                                
                                {budget ? (
                                    <>
                                        <p style={{ fontSize: '11px', color: getStrokeColor(percent), fontWeight: 700, marginBottom: '2px' }}>{Math.round(percent)}%</p>
                                        <p style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>{formatBudgetMoney(budget.spent)}</p>
                                        <p style={{ fontSize: '10px', color: '#9ca3af' }}>/ {formatBudgetMoney(budget.amount)}</p>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => editBudget(category)} style={{ marginTop: '4px', fontSize: '12px', color: '#10b981', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                        <Plus size={14} /> Đặt
                                    </button>
                                )}
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>}

        {/* MODAL SỬA NGÂN SÁCH */}
        {editing && (
            <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '350px', position: 'relative' }}>
                    <button onClick={() => setEditing(null)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                        <X size={24} />
                    </button>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', textAlign: 'center' }}>Đặt ngân sách</h3>
                    <p style={{ textAlign: 'center', color: '#6b7280', marginBottom: '20px', fontWeight: 500 }}>{editing.name}</p>
                    
                    <form className="ledger-form" onSubmit={(event) => save(event, editing)}>
                        <label style={{ display: 'block', marginBottom: '16px' }}>
                            Số tiền (VND)
                            <input 
                                name="amount" 
                                type="number" 
                                inputMode="decimal" 
                                min="0" 
                                max="999999999999.99" 
                                step="0.01" 
                                required 
                                autoFocus 
                                value={amount} 
                                disabled={busy} 
                                onChange={(event) => setAmount(event.target.value)} 
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', marginTop: '8px', fontSize: '18px', fontWeight: 'bold' }}
                            />
                        </label>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" className="btn-secondary" style={{ flex: 1 }} disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Hủy</button>
                            <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        <BottomNav />
    </main>;
}