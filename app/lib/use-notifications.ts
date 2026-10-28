'use client';
import { useCallback, useEffect, useState } from 'react';
import { requestJson } from './client-api';
import type { AppNotification } from './notifications';

export function useNotifications() {
    const [items, setItems] = useState<AppNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState('');
    const load = useCallback(async () => {
        try { const data = await requestJson<{ items: AppNotification[]; unread: number }>('/api/notifications'); setItems(data.items); setUnread(data.unread); setError(''); }
        catch (error) { setItems([]); setUnread(0); setError(error instanceof Error ? error.message : 'Không tải được thông báo.'); }
    }, []);
    useEffect(() => {
        void Promise.resolve().then(load);
        const timer = setInterval(load, 30000);
        window.addEventListener('focus', load);
        return () => { clearInterval(timer); window.removeEventListener('focus', load); };
    }, [load]);
    async function markRead(id: string) {
        try { await requestJson('/api/notifications', { id }); await load(); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không cập nhật được thông báo.'); }
    }
    return { items, unread, error, markRead };
}
