'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { requestJson } from '../lib/client-api';
import { accountRevision, cacheAccount, clearActiveAccount, synchronize, type OfflineAccount } from '../lib/offline';
import { FINANCE_UPDATED } from '../lib/finance-updates';

export default function PwaRuntime() {
    const pathname = usePathname();
    const [offline, setOffline] = useState(false);
    const [error, setError] = useState('');
    const lastUser = useRef<string | null>(null);
    useEffect(() => {
        let stopped = false;
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { if (!stopped) setError('Chưa sẵn sàng ngoại tuyến. Hãy mở ứng dụng qua HTTPS hoặc localhost.'); });
        async function refresh() {
            const revision = accountRevision();
            setOffline(!navigator.onLine);
            if (!navigator.onLine) return;
            try {
                const { user } = await requestJson<{ user: { id: string } | null }>('/api/auth/me');
                if (stopped || revision !== accountRevision()) return;
                if (!user) { await clearActiveAccount(); return; }
                const account = await requestJson<OfflineAccount>('/api/offline');
                if (stopped || revision !== accountRevision() || account.userId !== user.id) return;
                await cacheAccount(account, true, revision);
                const switched = lastUser.current !== null && lastUser.current !== user.id;
                lastUser.current = user.id;
                if (switched) { window.location.reload(); return; }
                await synchronize(user.id);
                if (!stopped) setError('');
            } catch { /* Keep durable entries on connectivity or session failures. */ }
        }
        void refresh();
        const timer = setInterval(refresh, 30000);
        window.addEventListener('online', refresh); window.addEventListener('offline', refresh); window.addEventListener('focus', refresh);
        window.addEventListener(FINANCE_UPDATED, refresh);
        return () => { stopped = true; clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('offline', refresh); window.removeEventListener('focus', refresh); window.removeEventListener(FINANCE_UPDATED, refresh); };
    }, [pathname]);
    return <>{offline && <aside className="offline-status" role="status">Đang ngoại tuyến. <a href="/offline">Mở phiếu ghi giao dịch ngoại tuyến</a></aside>}{error && <p role="status" className="offline-status">{error}</p>}</>;
}
