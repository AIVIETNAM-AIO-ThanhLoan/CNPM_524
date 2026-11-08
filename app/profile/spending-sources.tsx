'use client';

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { Building2, ChevronDown, Search, Wallet } from 'lucide-react';
import type { Wallet as AccountWallet } from '../lib/client-api';
import { readDefaults, saveDefaults, subscribeDefaults, type SpendingSource } from '../lib/default-preferences';

export type SourceBank = { bin: string; code: string; shortName: string; name: string };
const E_WALLETS: SpendingSource[] = [
    { id: 'ewallet:momo', name: 'MoMo', kind: 'ewallet' },
    { id: 'ewallet:zalopay', name: 'Zalopay', kind: 'ewallet' },
    { id: 'ewallet:shopeepay', name: 'ShopeePay', kind: 'ewallet' },
    { id: 'ewallet:viettel-money', name: 'Viettel Money', kind: 'ewallet' },
];
const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();

export default function SpendingSources({ userId, wallets, banks, loading, directoryError, retry }: {
    userId: string; wallets: AccountWallet[]; banks: SourceBank[]; loading: boolean; directoryError: string; retry: () => void;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const trigger = useRef<HTMLButtonElement>(null);
    const title = useRef<HTMLHeadingElement>(null);
    const id = useId();
    const subscribe = useCallback((onChange: () => void) => subscribeDefaults(userId, onChange), [userId]);
    const snapshot = useCallback(() => JSON.stringify(readDefaults(userId).spendingSources || []), [userId]);
    const stored = useSyncExternalStore(subscribe, snapshot, () => '[]');
    const selected = JSON.parse(stored) as SpendingSource[];
    const selectedIds = new Set(selected.map(source => source.id));
    const groups = [
        { label: 'Ví của bạn', kind: 'wallet', items: wallets.filter(wallet => !wallet.sourceKey).map(wallet => ({ id: `wallet:${wallet.id}`, name: wallet.name, kind: 'wallet' as const, detail: '' })) },
        { label: 'Ví điện tử', kind: 'ewallet', items: E_WALLETS.map(wallet => ({ ...wallet, detail: '' })) },
        { label: 'Ngân hàng', kind: 'bank', items: Array.from(new Map(banks.map(bank => [bank.bin, bank])).values()).map(bank => ({ id: `bank:${bank.bin}`, name: bank.shortName || bank.code, kind: 'bank' as const, detail: bank.name })) },
    ].map(group => ({ ...group, items: group.items.filter(source => normalize(`${source.name} ${source.detail}`).includes(normalize(query.trim()))) }));
    const availableIds = new Set(groups.flatMap(group => group.items.map(source => source.id)));
    const unavailable = selected.filter(source => !availableIds.has(source.id) && normalize(source.name).includes(normalize(query.trim())));

    useEffect(() => { if (open) title.current?.focus({ preventScroll: true }); }, [open]);

    function close() { setOpen(false); trigger.current?.focus({ preventScroll: true }); }
    function toggle(source: SpendingSource) {
        try {
            const current = readDefaults(userId);
            const enabled = (current.spendingSources || []).some(item => item.id === source.id);
            const sources = enabled ? current.spendingSources!.filter(item => item.id !== source.id)
                : [...(current.spendingSources || []), { id: source.id, name: source.name, kind: source.kind }];
            saveDefaults(userId, { ...current, spendingSources: sources });
            setError(''); setNotice(`${enabled ? 'Đã tắt' : 'Đã bật'} ${source.name}.`);
        } catch { setError('Không lưu được lựa chọn. Hãy kiểm tra quyền lưu trữ của trình duyệt.'); }
    }
    function row(source: SpendingSource & { detail?: string }) {
        return <button key={source.id} type="button" className="source-option" role="switch" aria-checked={selectedIds.has(source.id)} aria-label={`Sử dụng ${source.name}`} onClick={() => toggle(source)}>
            <span className={`source-option-icon source-option-icon-${source.kind}`} aria-hidden="true">{source.kind === 'bank' ? <Building2 size={18} /> : <Wallet size={18} />}</span>
            <span className="source-option-text"><strong>{source.name}</strong>{source.detail && <small>{source.detail}</small>}</span>
            <span className="source-switch" aria-hidden="true"><span /></span>
        </button>;
    }
    return <div className="spending-sources" onKeyDown={event => { if (event.key === 'Escape' && open) { event.preventDefault(); close(); } }}>
        <button ref={trigger} type="button" className="sources-trigger" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => { setOpen(!open); setQuery(''); }}>
            <span>Nguồn chi</span><span className="sources-summary">{selected.length === 1 ? selected[0].name : selected.length ? `${selected.length} nguồn đã chọn` : 'Chưa chọn'}</span><ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && <section id={`${id}-panel`} className="sources-panel" aria-labelledby={`${id}-title`}>
            <header className="sources-panel-header"><div><h3 id={`${id}-title`} ref={title} tabIndex={-1}>Nguồn chi</h3><p>Đã chọn {selected.length}</p></div><button type="button" className="sources-done" onClick={close}>Xong</button></header>
            <div className="sources-search"><Search size={17} aria-hidden="true" /><input aria-label="Tìm ngân hàng hoặc ví" type="search" placeholder="Tìm ngân hàng hoặc ví" value={query} onChange={event => setQuery(event.target.value)} /></div>
            {error && <p role="alert" className="sources-error">{error}</p>}
            <div className="sources-scroll" tabIndex={0} aria-label="Danh sách nguồn chi">
                {groups.map(group => group.items.length > 0 && <section key={group.kind} className="source-group" aria-label={group.label}><h4>{group.label}</h4>{group.items.map(row)}</section>)}
                {unavailable.length > 0 && <section className="source-group" aria-label="Nguồn đã chọn"><h4>Nguồn đã chọn</h4>{unavailable.map(row)}</section>}
                {loading && <p className="sources-loading" role="status">Đang tải ngân hàng…</p>}
                {directoryError && <div className="sources-directory-error"><p role="alert">{directoryError}</p><button type="button" onClick={retry}>Thử lại</button></div>}
                {!loading && !groups.some(group => group.items.length) && !unavailable.length && <p className="sources-loading">Không tìm thấy ngân hàng hoặc ví phù hợp.</p>}
            </div>
        </section>}
        <p className="sources-status" role="status">{notice}</p>
    </div>;
}
