'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, ChevronLeft, ChevronRight, ReceiptText, Search } from 'lucide-react';
import { dateKey, type Transaction } from '../lib/client-api';
import { useFinance } from '../lib/use-finance';
import BottomNav from '../components/BottomNav';
import TransactionRevision from '../components/TransactionRevision';
import '../styles/history.css';

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const monthLabel = (month: string) => `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`;
const shiftMonth = (month: string, delta: number) => {
    const d = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + delta, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const dayLabel = (bookedOn: string) => {
    const [y, m, d] = bookedOn.split('-').map(Number);
    const weekday = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'][new Date(y, m - 1, d).getDay()];
    return `${weekday}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
};

export default function History({ initialMonth, initialSearch }: { initialMonth: string; initialSearch: string }) {
    const [month, setMonth] = useState(initialMonth);
    const [search, setSearch] = useState(initialSearch);
    const [page, setPage] = useState(1);
    const [editing, setEditing] = useState<Transaction | null>(null);

    const end = dateKey(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0));
    const { data, error, loading } = useFinance(`${month}-01`, end, search, page);

    const visible = data.transactions;
    const groups = useMemo(() => {
        const map = new Map<string, Transaction[]>();
        for (const t of visible) map.set(t.bookedOn, [...(map.get(t.bookedOn) ?? []), t]);
        return [...map.entries()];
    }, [visible]);

    return (
        <div className="app-page">
            <header className="page-header history-header">
                <h1 className="page-title">Lịch sử</h1>
            </header>

            <div className="history-month">
                <button type="button" className="history-month-btn" aria-label="Tháng trước" onClick={() => { setPage(1); setMonth(shiftMonth(month, -1)); }}>
                    <ChevronLeft size={20} />
                </button>
                <label className="history-month-label">
                    <span>{monthLabel(month)}</span>
                    <input
                        type="month"
                        aria-label="Chọn tháng"
                        value={month}
                        min="1000-01"
                        max="9999-12"
                        onChange={(e) => { if (e.target.value) { setPage(1); setMonth(e.target.value); } }}
                    />
                </label>
                <button type="button" className="history-month-btn" aria-label="Tháng sau" onClick={() => { setPage(1); setMonth(shiftMonth(month, 1)); }}>
                    <ChevronRight size={20} />
                </button>
            </div>

            <label className="search-bar">
                <Search size={20} strokeWidth={1.8} />
                <input
                    className="search-input"
                    type="text"
                    placeholder="Tìm theo ghi chú, danh mục hoặc ví"
                    value={search}
                    maxLength={100}
                    onChange={(e) => { setPage(1); setSearch(e.target.value); }}
                />
            </label>

            <section className="card history-summary">
                <h2 className="history-summary-title">Tổng quan {monthLabel(month).toLowerCase()}</h2>
                <div className="summary-pair">
                    <div className="stat-box">
                        <span className="stat-label">Tổng thu</span>
                        <p className="stat-amount text-income">{formatMoney(data.income)}</p>
                    </div>
                    <div className="stat-box">
                        <span className="stat-label">Tổng chi</span>
                        <p className="stat-amount text-expense">{formatMoney(data.expense)}</p>
                    </div>
                </div>
            </section>

            <p className="data-status">
                <Link href="/transactions/new">+ Ghi giao dịch</Link> · {visible.length} giao dịch trên trang {page}.
            </p>
            {loading && <p className="data-status" role="status">Đang tải dữ liệu…</p>}
            {error && <p className="data-status" role="alert">{error} <Link href="/login">Đăng nhập</Link></p>}
            {editing && <TransactionRevision key={editing.id} transaction={editing} close={() => setEditing(null)} />}

            {!loading && !error && (visible.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <ReceiptText size={36} strokeWidth={1.6} />
                    </div>
                    <p className="empty-title">Không có giao dịch phù hợp</p>
                    <p className="empty-text">Thử đổi tháng, bộ lọc hoặc từ khóa tìm kiếm.</p>
                </div>
            ) : (
                groups.map(([bookedOn, items]) => (
                    <section key={bookedOn} className="history-group">
                        <h3 className="history-group-title">{dayLabel(bookedOn)}</h3>
                        <div className="tx-list">
                            {items.map((t) => {
                                const Icon = t.kind === 'income' ? ArrowDownLeft : t.kind === 'expense' ? ArrowUpRight : ArrowLeftRight;
                                const sign = t.kind === 'transfer' ? '' : (t.kind === 'income') !== Boolean(t.reversesId) ? '+' : '-';
                                return (
                                    <div key={t.id} className="tx-item">
                                        <div className="tx-info">
                                            <span className={`tx-icon tx-icon-${t.kind}`}>
                                                <Icon size={18} strokeWidth={1.8} />
                                            </span>
                                            <div>
                                                <p className="tx-title">{t.note || t.category || 'Chuyển tiền'}</p>
                                                <p className="tx-time">
                                                    {t.category && t.note ? `${t.category} · ` : ''}
                                                    {t.wallet}{t.target ? ` → ${t.target}` : ''}
                                                    {t.reversesId ? ' · Bút toán đối ứng' : t.reversed ? ' · Đã hủy/điều chỉnh' : t.replacesId ? ' · Giao dịch thay thế' : ''}
                                                    {t.reason && ` · ${t.reason}`}
                                                </p>
                                                {!t.reversesId && !t.reversed && <button type="button" className="btn-secondary" onClick={() => setEditing(t)}>Hủy / điều chỉnh</button>}
                                            </div>
                                        </div>
                                        <span className={`tx-amount ${sign === '+' ? 'text-income' : sign === '-' ? 'text-expense' : ''}`}>
                                            {sign}{formatMoney(Number(t.amount))}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))
            ))}

            <div className="history-month" aria-label="Phân trang lịch sử">
                <button type="button" className="history-month-btn" disabled={page === 1 || loading} onClick={() => setPage(page - 1)}>Trang trước</button>
                <span>Trang {page}</span>
                <button type="button" className="history-month-btn" disabled={!data.hasMore || loading} onClick={() => setPage(page + 1)}>Trang sau</button>
            </div>
            <BottomNav />
        </div>
    );
}
