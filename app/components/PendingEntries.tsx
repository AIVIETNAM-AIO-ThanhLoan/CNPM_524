'use client';
import { useCallback, useEffect, useState } from 'react';
import { discardFailed, onOfflineChange, pendingEntries, queueEntry, synchronize, type PendingEntry } from '../lib/offline';
import { useOnline } from '../lib/use-online';

export default function PendingEntries({ userId, hideWhenEmpty = false }: { userId: string; hideWhenEmpty?: boolean }) {
    const online = useOnline();

    const [items, setItems] = useState<PendingEntry[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const load = useCallback(() => { pendingEntries(userId).then(setItems).catch((error) => setError(error.message)); }, [userId]);
    useEffect(() => { load(); return onOfflineChange(load); }, [load]);
    async function retry(item: PendingEntry) {
        if (busy) return;
        setBusy(true); setError('');
        try { await queueEntry({ ...item, state: 'pending', error: '' }); await synchronize(userId); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không đồng bộ được.'); }
        finally { setBusy(false); }
    }
    if (hideWhenEmpty && !items.length && !error) return null;
    return <section className="card ledger-form pending-list" aria-label="Giao dịch chưa gửi">
        <h2>Giao dịch chưa gửi ({items.length})</h2>
        <p>{items.length ? 'Không xóa dữ liệu trình duyệt khi còn giao dịch chờ đồng bộ.' : 'Chưa có giao dịch chờ đồng bộ.'}</p>
        {error && <p role="alert">{error}</p>}
        {items.map((item) => <article key={item.requestKey}>
            <p>{String(item.payload.note || 'Giao dịch')} · {String(item.payload.amount)}đ · {item.state === 'failed' ? 'Gửi thất bại' : 'Chờ đồng bộ'}</p>
            {item.error && <p role="alert">{item.error}</p>}
            <div className="action-row"><button type="button" className="btn-secondary" disabled={busy || !online} onClick={() => retry(item)}>Thử đồng bộ</button>
                {item.state === 'failed' && <button type="button" className="btn-secondary" disabled={busy} onClick={async () => {
                    if (window.confirm('Xóa khoản bị từ chối này khỏi thiết bị để nhập lại?')) {
                        try { await discardFailed(item); } catch (error) { setError(error instanceof Error ? error.message : 'Không xóa được.'); }
                    }
                }}>Xóa khoản lỗi để nhập lại</button>}</div>
        </article>)}
    </section>;
}
