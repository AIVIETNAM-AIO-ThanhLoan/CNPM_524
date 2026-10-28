'use client';
import { useEffect, useRef, useState } from 'react';
import { requestJson, type Transaction, type Wallet, type Category } from '../lib/client-api';
import { notifyFinanceUpdated } from '../lib/finance-updates';

export default function TransactionRevision({ transaction, close }: { transaction: Transaction; close: () => void }) {
    const [action, setAction] = useState('cancel');
    const [kind, setKind] = useState(transaction.kind);
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const keys = useRef<{ requestKey: string; replacementKey: string } | null>(null);
    useEffect(() => {
        Promise.all([requestJson<{ wallets: Wallet[] }>('/api/wallets'), requestJson<{ categories: Category[] }>('/api/categories')])
            .then(([w, c]) => { setWallets(w.wallets); setCategories(c.categories); }).catch((e) => setError(e.message));
    }, []);
    async function save(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const data = Object.fromEntries(new FormData(event.currentTarget));
        if (!keys.current) keys.current = { requestKey: crypto.randomUUID(), replacementKey: crypto.randomUUID() };
        setBusy(true); setError('');
        try {
            await requestJson('/api/transactions/reverse', { id: transaction.id, action, reason: data.reason, requestKey: keys.current.requestKey,
                ...(action === 'correct' ? { replacement: { ...data, kind, requestKey: keys.current.replacementKey } } : {}) });
            notifyFinanceUpdated(); close();
        } catch (error) { setError(error instanceof Error ? error.message : 'Không điều chỉnh được.'); }
        finally { setBusy(false); }
    }
    return <section className="card ledger-form" aria-label="Hủy hoặc điều chỉnh giao dịch">
        <h2>Hủy hoặc điều chỉnh: {transaction.note || transaction.category || 'Chuyển tiền'}</h2>
        <p>Giữ giao dịch gốc và thêm bút toán đối ứng vào ngày gốc. Điều chỉnh sẽ ghi thêm giao dịch thay thế theo ngày bạn chọn.</p>
        {error && <p role="alert" className="ledger-error">{error}</p>}
        <form className="ledger-form" onSubmit={save}>
            <label>Thao tác<select value={action} disabled={busy} onChange={(e) => setAction(e.target.value)}><option value="cancel">Hủy giao dịch</option><option value="correct">Điều chỉnh giao dịch</option></select></label>
            <label>Lý do<input name="reason" required maxLength={255} /></label>
            {action === 'correct' && <>
                <label>Loại<select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="expense">Chi tiền</option><option value="income">Thu tiền</option><option value="transfer">Chuyển ví</option></select></label>
                <label>Ví<select name="walletId" required defaultValue={transaction.walletId}>{wallets.map((w) => <option value={w.id} key={w.id}>{w.name}</option>)}</select></label>
                {kind === 'transfer' ? <label>Ví nhận<select name="targetId" required defaultValue={transaction.targetId || ''}>{wallets.map((w) => <option value={w.id} key={w.id}>{w.name}</option>)}</select></label>
                    : <label>Danh mục<select name="categoryId" required defaultValue={transaction.categoryId || ''}>{categories.filter((c) => c.kind === kind).map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>}
                <label>Số tiền (VND)<input name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={transaction.amount} required /></label>
                <label>Ngày giao dịch<input name="bookedOn" type="date" min="1000-01-01" max="9999-12-31" defaultValue={transaction.bookedOn} required /></label>
                <label>Ghi chú<input name="note" maxLength={500} defaultValue={transaction.note} /></label>
            </>}
            <div className="action-row"><button className="btn-primary" disabled={busy}>Xác nhận</button><button type="button" className="btn-secondary" disabled={busy} onClick={close}>Đóng</button></div>
        </form>
    </section>;
}
