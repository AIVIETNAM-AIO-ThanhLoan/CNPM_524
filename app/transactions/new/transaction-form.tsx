'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { type Category, requestJson, today, type Wallet } from '@/app/lib/client-api';
import AddCategoryButton from '@/app/components/AddCategoryButton';
import VoiceAssistant from '@/app/components/VoiceAssistant';
import { notifyFinanceUpdated } from '@/app/lib/finance-updates';
import { cacheAccount, pendingEntries, queueEntry, synchronize } from '@/app/lib/offline';
import PendingEntries from '@/app/components/PendingEntries';
import { useOnline } from '@/app/lib/use-online';
import { readDefaults } from '@/app/lib/default-preferences';
import '../../styles/ledger.css';
import '../../styles/transaction.css';

export default function TransactionForm({ userId, initialWallets, initialCategories }: { userId: string; initialWallets: Wallet[]; initialCategories: Category[] }) {
    const router = useRouter();
    const online = useOnline();
    const [wallets, setWallets] = useState(initialWallets);
    const [categories, setCategories] = useState(initialCategories);
    const [kind, setKind] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const [queued, setQueued] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [bookedOn, setBookedOn] = useState(today);
    const pending = useRef<{ payload: string; key: string } | null>(null);
    const visibleCategories = categories.filter((c) => c.kind === kind);
    const categoryId = visibleCategories.find((c) => c.id === selectedCategory)?.id || visibleCategories[0]?.id || '';

    useEffect(() => {
        const wallet = formRef.current?.elements.namedItem('walletId');
        const id = readDefaults(userId).walletId;
        if (wallet instanceof HTMLSelectElement && initialWallets.some(w => w.id === id)) wallet.value = id;
    }, [userId, initialWallets]);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        const payload = { kind, walletId: form.get('walletId'), targetId: form.get('targetId'), categoryId: form.get('categoryId'),
            amount: form.get('amount'), bookedOn, note: form.get('note') };
        const fingerprint = JSON.stringify(payload);
        if (pending.current && pending.current.payload !== fingerprint) { setError('Khoản trước chưa rõ kết quả. Hãy kiểm tra Giao dịch chưa gửi trước khi nhập khoản khác.'); return; }
        if (!pending.current || pending.current.payload !== fingerprint) pending.current = { payload: fingerprint, key: crypto.randomUUID() };
        setBusy(true); setError(''); setSuccess('');
        try {
            await cacheAccount({ userId, wallets, categories });
            await queueEntry({ userId, requestKey: pending.current.key, payload, state: 'pending', error: '', createdAt: new Date().toISOString() });
            await synchronize(userId).catch(() => undefined);
            const remaining = (await pendingEntries(userId)).find((item) => item.requestKey === pending.current?.key);
            if (remaining) {
                setQueued(true);
                if (remaining.state === 'failed') setError(remaining.error);
                else setSuccess('Đã lưu trên thiết bị, chờ đồng bộ khi có mạng và đăng nhập đúng tài khoản.');
                return;
            }
            pending.current = null;
            notifyFinanceUpdated();
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

    return <main className={`app-page tx-page${online ? '' : ' tx-page-offline'}`}>
        <header className="tx-header">{online && <Link href="/" className="tx-round-btn" aria-label="Quay lại"><ArrowLeft size={20} strokeWidth={1.8} /></Link>}<h1 className="tx-title">Ghi giao dịch</h1>{online && <VoiceAssistant className="btn-secondary voice-launcher" label="" />}</header>
        {error && <p className="ledger-error" role="alert">{error}</p>}
        {success && <p role="status">{success}</p>}
        {queued && <button className="btn-secondary" type="button" disabled={busy} onClick={() => {
            pending.current = null; setSuccess(''); setError(''); setQueued(false);
            formRef.current?.reset();
        }}>Ghi khoản khác</button>}
        
        <form ref={formRef} className="tx-form ledger-form" onSubmit={submit}>
            <fieldset className="tx-type-switch">
                <legend className="tx-sr-only">Loại giao dịch</legend>
                {([{ value: 'expense', label: 'Chi' }, { value: 'income', label: 'Thu' }, { value: 'transfer', label: 'Chuyển' }] as const).map((item) =>
                    <label key={item.value}><input type="radio" name="kind" value={item.value} checked={kind === item.value} onChange={() => setKind(item.value)} /><span>{item.label}</span></label>)}
            </fieldset>
            <label className="tx-amount-box"><span className="tx-amount-label">{kind === 'expense' ? 'Số tiền chi' : kind === 'income' ? 'Số tiền thu' : 'Số tiền chuyển'}</span><span className="tx-amount-row"><input className="tx-amount-input" name="amount" type="number" min="0.01" max="999999999999.99" step="0.01" required inputMode="decimal" placeholder="0" aria-label="Số tiền" /><span className="tx-amount-unit">đ</span></span></label>
            <div className="tx-details">
                {kind !== 'transfer' && <label className="tx-detail"><span>Danh mục</span><select name="categoryId" aria-label="Danh mục" value={categoryId} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {!visibleCategories.length && <option value="">Chưa có danh mục</option>}
                    {visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>}
                <label className="tx-detail"><span>{kind === 'transfer' ? 'Ví nguồn' : kind === 'income' ? 'Nhận vào' : 'Nguồn chi'}</span><select name="walletId" aria-label="Ví" required>
                    {wallets.map((w) => <option key={w.id} value={w.id}>{w.name} · {Number(w.balance).toLocaleString('vi-VN')}đ</option>)}
                </select></label>
                {kind === 'transfer' && <label className="tx-detail"><span>Ví nhận</span><select name="targetId" aria-label="Ví nhận" required>{wallets.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></label>}
                <label className="tx-detail"><span>Ngày</span><input aria-label="Ngày giao dịch" type="date" min="1000-01-01" max="9999-12-31" value={bookedOn} onChange={(e) => setBookedOn(e.target.value)} required /></label>
                <label className="tx-detail"><span>Ghi chú</span><input name="note" aria-label="Ghi chú" placeholder="Không bắt buộc" maxLength={500} /></label>
            </div>
            <button type="submit" className="btn-primary tx-save" disabled={busy || !wallets.length || (kind !== 'transfer' && !categoryId)}>{busy ? 'Đang lưu…' : kind === 'expense' ? 'Lưu khoản chi' : kind === 'income' ? 'Lưu khoản thu' : 'Lưu chuyển tiền'}</button>
            {(!wallets.length || (kind !== 'transfer' && !categoryId)) && <p role="status">Thêm ví và danh mục bên dưới để bắt đầu ghi giao dịch.</p>}
            <details className="tx-help"><summary>Lưu ý khi ghi giao dịch</summary><p>Chuyển giữa các ví không tính vào thu/chi. Bạn có thể ghi số dư âm để phản ánh khoản chi chưa nhập nguồn tiền.</p></details>

        </form>
        
        {online && <div className="tx-tools">
            {kind !== 'transfer' && <AddCategoryButton kind={kind} disabled={busy} onAdded={(category) => { setCategories((items) => [...items, category]); setSelectedCategory(category.id); setError(''); setSuccess('Đã thêm danh mục.'); }} />}
            <Link href="/manage">Quản lý ví</Link>
        </div>}
        <PendingEntries userId={userId} hideWhenEmpty />

        {online && <details className="card tx-extra"><summary>Thêm ví (cần mạng)</summary><form className="ledger-form" onSubmit={(e) => addOption(e, 'wallets')}>
            <label>Tên ví<input name="name" maxLength={100} required /></label><p>Ví mới bắt đầu từ 0đ.</p><button className="btn-secondary" disabled={busy}>Thêm ví</button>
        </form></details>}
        
    </main>;
}
