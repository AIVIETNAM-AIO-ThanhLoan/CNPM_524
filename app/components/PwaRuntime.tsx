'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { requestJson } from '../lib/client-api';
import { accountRevision, cacheAccount, clearActiveAccount, synchronize, type OfflineAccount } from '../lib/offline';
import { FINANCE_UPDATED } from '../lib/finance-updates';
import { useOnline } from '../lib/use-online';

export default function PwaRuntime() {
    const pathname = usePathname();
    const online = useOnline();
    const [error, setError] = useState('');
    const lastUser = useRef<string | null>(null);
    useEffect(() => {
        // Offline navigation must reach the worker's HTML shell, not request an RSC payload.
        const navigate = (event: MouseEvent) => {
            if (navigator.onLine || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const link = event.target instanceof Element ? event.target.closest('a') : null;
            if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
            const url = new URL(link.href);
            if (url.origin !== location.origin || (url.pathname === location.pathname && url.hash)) return;
            event.preventDefault();
            event.stopPropagation();
            location.assign(url.href);
        };
        document.addEventListener('click', navigate, true);
        return () => document.removeEventListener('click', navigate, true);
    }, []);
    useEffect(() => {
        let stopped = false;
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => { if (!stopped) setError('Chưa sẵn sàng ngoại tuyến. Hãy mở ứng dụng qua HTTPS hoặc localhost.'); });
        async function refresh() {
            const revision = accountRevision();
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
    return <>{!online && <aside className="offline-status" role="status">
        <WifiOff size={22} aria-hidden="true" />
        <div><strong>Bạn đang ngoại tuyến</strong><p>Xem dữ liệu đã lưu hoặc ghi giao dịch chờ đồng bộ khi có mạng.</p>
            {/* A full navigation loads the cached offline shell. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Xem dữ liệu ngoại tuyến</a>
        </div>
    </aside>}{error && <p role="status" className="offline-status">{error}</p>}</>;
}
