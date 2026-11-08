'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { type Category, requestJson, today, type Wallet } from '@/app/lib/client-api';
import VoiceAssistant from '@/app/components/VoiceAssistant';
import { FINANCE_UPDATED, notifyFinanceUpdated } from '@/app/lib/finance-updates';
import { cacheAccount, pendingEntries, queueEntry, synchronize } from '@/app/lib/offline';
import PendingEntries from '@/app/components/PendingEntries';
import { useOnline } from '@/app/lib/use-online';
import { readDefaults, subscribeDefaults, type DefaultPreferences } from '@/app/lib/default-preferences';
import { spendingSourceOptions } from '@/app/lib/spending-source-options';
import '../../styles/ledger.css';
import '../../styles/transaction.css';

export default function TransactionForm({ userId, initialWallets, initialCategories }: { userId: string; initialWallets: Wallet[]; initialCategories: Category[] }) {
    const online = useOnline();
    const [wallets, setWallets] = useState(initialWallets);
    const categories = initialCategories;
    const [kind, setKind] = useState<'income' | 'expense' | 'transfer'>('expense');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedWallet, setSelectedWallet] = useState('');
    const [selectedTarget, setSelectedTarget] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [busy, setBusy] = useState(false);
    const [queued, setQueued] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);
    const [bookedOn, setBookedOn] = useState(today);
    const pending = useRef<{ payload: string; key: string } | null>(null);
    const visibleCategories = categories.filter((c) => c.kind === kind);
    const categoryId = visibleCategories.find((c) => c.id === selectedCategory)?.id || visibleCategories[0]?.id || '';
    const subscribe = useCallback((onChange: () => void) => subscribeDefaults(userId, onChange), [userId]);
    const snapshot = useCallback(() => JSON.stringify(readDefaults(userId)), [userId]);
    const stored = useSyncExternalStore(subscribe, snapshot, () => '{"walletId":"","androidApp":"","iosApp":""}');
    const defaults = JSON.parse(stored) as DefaultPreferences;
    const sources = spendingSourceOptions(wallets, defaults.spendingSources);
    const walletValue = sources.find(source => source.value === selectedWallet)?.value
        || sources.find(source => source.walletId === defaults.walletId)?.value || sources[0]?.value || '';
    const targetValue = sources.find(source => source.value === selectedTarget && source.value !== walletValue)?.value
        || sources.find(source => source.value !== walletValue)?.value || '';

    useEffect(() => {
        let controller: AbortController | undefined;
        function refresh() {
            if (!navigator.onLine) return;
            controller?.abort();
            const request = new AbortController();
            controller = request;
            void requestJson<{ wallets: Wallet[] }>('/api/wallets', undefined, request.signal)
                .then(({ wallets }) => { if (!request.signal.aborted) setWallets(wallets); })
                .catch(() => { /* Keep the cached balances when refreshing is unavailable. */ });
        }
        const storage = (event: StorageEvent) => { if (event.key === FINANCE_UPDATED) refresh(); };
        window.addEventListener(FINANCE_UPDATED, refresh);
        window.addEventListener('storage', storage);
        return () => { controller?.abort(); window.removeEventListener(FINANCE_UPDATED, refresh); window.removeEventListener('storage', storage); };
    }, [userId]);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        const source = sources.find(source => source.value === form.get('walletId'));
        const target = kind === 'transfer' ? sources.find(source => source.value === form.get('targetId')) : undefined;
        if (!source || (kind === 'transfer' && !target)) { setError('Hãy chọn nguồn chi trong phần Tôi trước khi ghi giao dịch.'); return; }
        const payload = { kind, walletId: source.source ? null : source.walletId, targetId: target?.source ? null : target?.walletId || null,
            ...(source.source ? { walletSource: source.source } : {}), ...(target?.source ? { targetSource: target.source } : {}), categoryId: form.get('categoryId'),
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
            setQueued(false);
            setSuccess('Ghi giao dịch thành công.');
            for (const name of ['amount', 'note'] as const) {
                const input = formRef.current?.elements.namedItem(name);
                if (input instanceof HTMLInputElement && input.value === payload[name]) input.value = '';
            }
            notifyFinanceUpdated();
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu giao dịch.'); }
        finally { setBusy(false); }
    }

    return <main className={`app-page tx-page${online ? '' : ' tx-page-offline'}`}>
        <header className="tx-header">{online && <Link href="/" className="tx-round-btn" aria-label="Quay lại"><ArrowLeft size={20} strokeWidth={1.8} /></Link>}<h1 className="tx-title">Ghi giao dịch</h1>{online && <VoiceAssistant className="btn-secondary voice-launcher" label="" />}</header>
        {error && <p className="ledger-error" role="alert">{error}</p>}
        {success && <p className="tx-feedback" role="status"><CheckCircle2 size={20} aria-hidden="true" /><span>{success}</span></p>}
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
            <label className="tx-amount-box"><span className="tx-amount-label">{kind === 'expense' ? 'Số tiền chi' : kind === 'income' ? 'Số tiền thu' : 'Số tiền chuyển'}</span><span className="tx-amount-row"><input className="tx-amount-input" name="amount" type="number" min="1" max="999999999999" step="1" required inputMode="numeric" placeholder="0" aria-label="Số tiền" /><span className="tx-amount-unit">đ</span></span></label>
            <div className="tx-details">
                {kind !== 'transfer' && <label className="tx-detail"><span>Danh mục</span><select name="categoryId" aria-label="Danh mục" value={categoryId} onChange={(e) => setSelectedCategory(e.target.value)}>
                    {!visibleCategories.length && <option value="">Chưa có danh mục</option>}
                    {visibleCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select></label>}
                <label className="tx-detail"><span>{kind === 'transfer' ? 'Ví nguồn' : kind === 'income' ? 'Nhận vào' : 'Nguồn chi'}</span><select name="walletId" aria-label="Ví" value={walletValue} onChange={event => setSelectedWallet(event.target.value)} required>
                    {!sources.length && <option value="">Chưa chọn nguồn chi</option>}
                    {sources.map(source => <option key={source.value} value={source.value}>{source.name} · {Number(source.balance).toLocaleString('vi-VN')}đ</option>)}
                </select></label>
                {kind === 'transfer' && <label className="tx-detail"><span>Ví nhận</span><select name="targetId" aria-label="Ví nhận" value={targetValue} onChange={event => setSelectedTarget(event.target.value)} required>
                    {!targetValue && <option value="">Chọn thêm nguồn nhận</option>}
                    {sources.filter(source => source.value !== walletValue).map(source => <option key={source.value} value={source.value}>{source.name}</option>)}
                </select></label>}
                <label className="tx-detail"><span>Ngày</span><input aria-label="Ngày giao dịch" type="date" min="1000-01-01" max="9999-12-31" value={bookedOn} onChange={(e) => setBookedOn(e.target.value)} required /></label>
                <label className="tx-detail"><span>Ghi chú</span><input name="note" aria-label="Ghi chú" placeholder="Không bắt buộc" maxLength={500} /></label>
            </div>
            <button type="submit" className="btn-primary tx-save" disabled={busy || !sources.length || (kind === 'transfer' ? !targetValue : !categoryId)}>{busy ? 'Đang lưu…' : kind === 'expense' ? 'Lưu khoản chi' : kind === 'income' ? 'Lưu khoản thu' : 'Lưu chuyển tiền'}</button>
            {!sources.length && <p role="status">Chọn nguồn chi trong <Link href="/profile">Tôi → Cài đặt mặc định</Link> để ghi giao dịch.</p>}
            {kind === 'transfer' && sources.length === 1 && <p role="status">Bật thêm một nguồn chi trong phần Tôi để chuyển tiền giữa hai nguồn.</p>}
            {kind !== 'transfer' && !categoryId && <p role="status">Vào Quản lý ví để thêm danh mục trước khi ghi giao dịch.</p>}
        </form>
        
        {online && <div className="tx-tools">
            <Link href="/manage">Quản lý ví</Link>
        </div>}
        <PendingEntries userId={userId} hideWhenEmpty />
    </main>;
}
