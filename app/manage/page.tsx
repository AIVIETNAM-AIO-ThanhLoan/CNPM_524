'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import { requestJson } from '../lib/client-api';
import { notifyFinanceUpdated } from '../lib/finance-updates';

type Item = { id: string; name: string; archived: boolean | number; balance?: string; kind?: string };
export default function ManagePage() {
    const [wallets, setWallets] = useState<Item[]>([]);
    const [categories, setCategories] = useState<Item[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(async () => {
        const [wallets, categories] = await Promise.all([requestJson<{ wallets: Item[] }>('/api/wallets?all=1'), requestJson<{ categories: Item[] }>('/api/categories?all=1')]);
        setWallets(wallets.wallets); setCategories(categories.categories);
    }, []);
    useEffect(() => { Promise.resolve().then(load).catch((error) => setError(error.message)); }, [load]);
    async function save(type: string, body: unknown) {
        if (busy) return;
        setBusy(true); setError('');
        try { await requestJson(`/api/${type}`, body); await load(); notifyFinanceUpdated(); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không lưu được.'); }
        finally { setBusy(false); }
    }
    return <main className="app-page ledger-page">
        <header className="page-header"><Link href="/profile">← Ví của tôi</Link><h1>Quản lý ví và danh mục</h1></header>
        <p>Lưu trữ để ngừng sử dụng, lịch sử vẫn được giữ. Chỉ lưu trữ ví có số dư 0đ. Loại danh mục không đổi để giữ đúng báo cáo.</p>
        {error && <p role="alert" className="ledger-error">{error}</p>}
        {(['wallets', 'categories'] as const).map((type) => <section className="card" key={type}>
            <h2>{type === 'wallets' ? 'Ví' : 'Danh mục'}</h2>
            <form className="ledger-form" onSubmit={(event) => { event.preventDefault(); void save(type, Object.fromEntries(new FormData(event.currentTarget))); }}>
                <label>Tên mới<input name="name" maxLength={type === 'wallets' ? 100 : 80} required /></label>
                {type === 'categories' && <label>Loại<select name="kind"><option value="expense">Chi tiền</option><option value="income">Thu tiền</option></select></label>}
                <button className="btn-primary" disabled={busy}>{type === 'wallets' ? 'Thêm ví' : 'Thêm danh mục'}</button>
            </form>
            {(type === 'wallets' ? wallets : categories).map((item) => <form className="ledger-form management-item" key={`${item.id}:${item.name}`} onSubmit={(event) => { event.preventDefault(); void save(type, { id: item.id, name: new FormData(event.currentTarget).get('name') }); }}>
                <label>Tên {item.kind ? (item.kind === 'income' ? 'danh mục thu' : 'danh mục chi') : 'ví'}<input name="name" defaultValue={item.name} required maxLength={type === 'wallets' ? 100 : 80} /></label>
                {item.balance !== undefined && <p>Số dư: {Number(item.balance).toLocaleString('vi-VN')}đ</p>}
                <p>{item.archived ? 'Đã lưu trữ' : 'Đang sử dụng'}</p>
                <div className="action-row"><button className="btn-secondary" disabled={busy}>Đổi tên</button><button className="btn-secondary" type="button" disabled={busy} onClick={() => save(type, { id: item.id, archived: !item.archived })}>{item.archived ? 'Khôi phục' : 'Lưu trữ'}</button></div>
            </form>)}
        </section>)}
        <BottomNav />
    </main>;
}
