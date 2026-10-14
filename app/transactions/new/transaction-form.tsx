'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { type Category, requestJson, today, type Wallet } from '@/app/lib/client-api';
import BottomNav from '@/app/components/BottomNav';
import '../../styles/ledger.css';

export default function TransactionForm({ initialWallets, initialCategories }: { initialWallets: Wallet[]; initialCategories: Category[] }) {
    const router = useRouter();
    const [wallets, setWallets] = useState(initialWallets);
    const [categories, setCategories] = useState(initialCategories);
    const [kind, setKind] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const [bookedOn, setBookedOn] = useState(today);
    // Retain a key on ambiguous network failure. Prevent accidental duplicate posting.
    const pending = useRef<{ payload: string; key: string } | null>(null);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        const payload = { kind, walletId: form.get('walletId'), targetId: form.get('targetId'), categoryId: form.get('categoryId'),
            amount: form.get('amount'), bookedOn, note: form.get('note') };
        const fingerprint = JSON.stringify(payload);
        if (!pending.current || pending.current.payload !== fingerprint) pending.current = { payload: fingerprint, key: crypto.randomUUID() };
        setBusy(true); setError(''); setSuccess('');
        try {
            await requestJson('/api/transactions', { ...payload, requestKey: pending.current.key });
            pending.current = null;
            router.push('/history'); router.refresh();
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu giao dịch.'); }
        finally { setBusy(false); }
    }

    async function addOption(event: React.FormEvent<HTMLFormElement>, type: 'wallets' | 'categories') {
        event.preventDefault();
        if (busy) return;
        const element = event.currentTarget;
        const form = new FormData(element);
        setBusy(true); setError(''); setSuccess('');
        try {
            await requestJson(`/api/${type}`, { name: form.get('name'), kind: form.get('kind') });
            if (type === 'wallets') setWallets((await requestJson<{ wallets: Wallet[] }>('/api/wallets')).wallets);
            else setCategories((await requestJson<{ categories: Category[] }>('/api/categories')).categories);
            element.reset(); setSuccess('Đã thêm thành công.');
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu.'); }
        finally { setBusy(false); }
    }

    return <main className="app-page ledger-page">
        <header className="page-header"><h1 className="page-title">Ghi giao dịch</h1><Link href="/">Về trang chủ</Link></header>
        {error && <p className="ledger-error" role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
        <form className="card ledger-form" onSubmit={submit}>
            <label>Loại giao dịch<select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="expense">Chi tiền</option><option value="income">Thu tiền</option><option value="transfer">Chuyển giữa hai ví</option></select></label>
            <label>{kind === 'transfer' ? 'Ví nguồn' : 'Ví'}<select name="walletId" required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name} · {Number(w.balance).toLocaleString('vi-VN')}đ</option>)}</select></label>
            {kind === 'transfer' ? <label>Ví nhận<select name="targetId" required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
                : <label>Danh mục<select key={kind} name="categoryId" required>{categories.filter((c) => c.kind === kind).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
            <label>Số tiền (VND)<input name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" required inputMode="decimal" /></label>
            <label>Ngày giao dịch<input type="date" min="1000-01-01" max="9999-12-31" value={bookedOn} onChange={(e) => setBookedOn(e.target.value)} required /></label>
            <label>Ghi chú<input name="note" maxLength={500} /></label>
            <p>Chuyển giữa các ví không tính vào thu/chi. Bạn có thể ghi số dư âm để phản ánh khoản chi chưa nhập nguồn tiền.</p>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu giao dịch'}</button>
        </form>
        <details className="card"><summary>Thêm ví</summary><form className="ledger-form" onSubmit={(e) => addOption(e, 'wallets')}>
            <label>Tên ví<input name="name" maxLength={100} required /></label><p>Ví mới bắt đầu từ 0đ.</p><button className="btn-secondary" disabled={busy}>Thêm ví</button>
        </form></details>
        <details className="card"><summary>Thêm danh mục</summary><form className="ledger-form" onSubmit={(e) => addOption(e, 'categories')}>
            <label>Tên danh mục<input name="name" maxLength={80} required /></label><label>Loại<select name="kind"><option value="expense">Chi</option><option value="income">Thu</option></select></label><button className="btn-secondary" disabled={busy}>Thêm danh mục</button>
        </form></details>
        <BottomNav />
    </main>;
}
