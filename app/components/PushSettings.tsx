'use client';
import { useState } from 'react';
import { requestJson } from '../lib/client-api';

export default function PushSettings() {
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    async function toggle(enable: boolean) {
        setBusy(true); setMessage('');
        try {
            if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) throw new Error('Trình duyệt chưa hỗ trợ Web Push. Trên iPhone, hãy thêm ứng dụng vào màn hình chính.');
            if (enable && await Notification.requestPermission() !== 'granted') throw new Error('Bạn chưa cho phép thông báo. Hãy kiểm tra quyền trong trình duyệt.');
            const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' });
            await navigator.serviceWorker.ready;
            const existing = await registration.pushManager.getSubscription();
            if (!enable) {
                if (existing) { await requestJson('/api/push', { ...existing.toJSON(), action: 'unsubscribe' }); await existing.unsubscribe(); }
                setMessage('Đã tắt thông báo trên thiết bị này.'); return;
            }
            const { publicKey } = await requestJson<{ publicKey: string }>('/api/push');
            if (!publicKey) throw new Error('Máy chủ chưa cấu hình Web Push.');
            const bytes = Uint8Array.from(atob(publicKey.replace(/-/g, '+').replace(/_/g, '/')), (char) => char.charCodeAt(0));
            const subscription = existing || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes });
            await requestJson('/api/push', subscription.toJSON());
            setMessage('Đã bật thông báo trên thiết bị này.');
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Không đăng ký được thông báo.'); }
        finally { setBusy(false); }
    }
    return <section className="card ledger-form"><h2>Thông báo trên thiết bị</h2><p>Cần HTTPS, quyền thông báo và máy chủ nhắc đang chạy.</p>
        <div className="action-row"><button className="btn-primary" disabled={busy} onClick={() => toggle(true)}>Bật thông báo</button><button className="btn-secondary" disabled={busy} onClick={() => toggle(false)}>Tắt thông báo</button></div>
        {message && <p role="status">{message}</p>}
    </section>;
}
