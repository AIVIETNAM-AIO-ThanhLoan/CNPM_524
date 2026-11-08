'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import { formatDate, requestJson, today, type Wallet, type Category } from '../lib/client-api';
import { notifyFinanceUpdated } from '../lib/finance-updates';

type Recurring = { id: string; name: string; amount: string; walletId: string; categoryId: string; nextDueOn: string; frequency: string; enabled: boolean; wallet: string; category: string };
export default function RemindersPage() {
    const [items, setItems] = useState<Recurring[]>([]);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [editing, setEditing] = useState<Recurring | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const pending = useRef(new Map<string, string>());
    const load = useCallback(async () => {
        const [list, wallets, categories] = await Promise.all([requestJson<{ recurring: Recurring[] }>('/api/recurring'), requestJson<{ wallets: Wallet[] }>('/api/wallets'), requestJson<{ categories: Category[] }>('/api/categories')]);
        setItems(list.recurring); setWallets(wallets.wallets); setCategories(categories.categories.filter((c) => c.kind === 'expense'));
    }, []);
    useEffect(() => { Promise.resolve().then(load).catch((error) => setError(error.message)); }, [load]);
    async function save(body: unknown) {
        if (busy) return;
        setBusy(true); setError('');
        try { await requestJson('/api/recurring', body); await load(); setEditing(null); notifyFinanceUpdated(); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được.'); }
        finally { setBusy(false); }
    }
    function confirm(item: Recurring) {
        if (!window.confirm(`Bạn đã thanh toán ${item.name}, ${Number(item.amount).toLocaleString('vi-VN')}đ? Chỉ xác nhận sau khi đã trả tiền.`)) return;
        const key = `${item.id}:${item.nextDueOn}`;
        if (!pending.current.has(key)) pending.current.set(key, crypto.randomUUID());
        void save({ id: item.id, action: 'confirm', dueOn: item.nextDueOn, requestKey: pending.current.get(key) });
    }
    return <main className="app-page ledger-page">
        <header className="page-header"><Link href="/">← Trang chủ</Link><h1>Lời nhắc thanh toán</h1></header>
        {error && <p role="alert" className="ledger-error">{error}</p>}
        <form className="card ledger-form" key={editing?.id || 'new'} onSubmit={(event) => { event.preventDefault(); void save({ ...Object.fromEntries(new FormData(event.currentTarget)), ...(editing ? { id: editing.id } : {}) }); }}>
            <h2>{editing ? 'Sửa khoản định kỳ' : 'Thêm khoản định kỳ'}</h2>
            <label>Tên khoản thanh toán<input name="name" maxLength={100} required defaultValue={editing?.name} /></label>
            <label>Ví<select name="walletId" required defaultValue={editing?.walletId}>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
            <label>Danh mục<select name="categoryId" required defaultValue={editing?.categoryId}>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
            <label>Số tiền (VND)<input name="amount" type="number" min="1" max="999999999999" step="1" required defaultValue={editing?.amount} /></label>
            <label>Ngày đến hạn<input name="nextDueOn" type="date" min="1000-01-01" max="9999-12-31" required defaultValue={editing?.nextDueOn || today()} /></label>
            <label>Chu kỳ<select name="frequency" defaultValue={editing?.frequency || 'monthly'}><option value="weekly">Hàng tuần</option><option value="monthly">Hàng tháng</option><option value="yearly">Hàng năm</option></select></label>
            <button className="btn-primary" disabled={busy}>Lưu khoản định kỳ</button>
            {editing && <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Hủy sửa</button>}
        </form>
        {items.map((item) => <article className="card ledger-form" key={item.id}>
            <h2>{item.name}</h2><p>{Number(item.amount).toLocaleString('vi-VN')}đ · {item.wallet} · {item.category}</p>
            <p>Hạn {formatDate(item.nextDueOn)} ·{item.enabled ? 'Đang nhắc' : 'Đã tạm dừng'}</p>
            <div className="action-row"><button className="btn-secondary" disabled={busy} onClick={() => setEditing(item)}>Sửa</button>
                <button className="btn-secondary" disabled={busy} onClick={() => save({ id: item.id, action: 'toggle', enabled: !item.enabled })}>{item.enabled ? 'Tạm dừng' : 'Bật lại'}</button>
                {Boolean(item.enabled) && item.nextDueOn <= today() && <button className="btn-primary" disabled={busy} onClick={() => confirm(item)}>Xác nhận đã thanh toán</button>}</div>
        </article>)}
        <BottomNav />
    </main>;
}
