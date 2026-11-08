'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { requestJson, type Wallet } from '../lib/client-api';
import { bankPlatform, readDefaults, saveDefaults, type DefaultPreferences } from '../lib/default-preferences';

type Image = { id: string; label: string; isPrimary: boolean | number };
type App = { appId: string; appName: string };
export default function DefaultSettings({ userId }: { userId: string }) {
    const [values, setValues] = useState<DefaultPreferences>({ walletId: '', androidApp: '', iosApp: '' });
    const [wallets, setWallets] = useState<Wallet[]>([]);
    const [images, setImages] = useState<Image[]>([]);
    const [apps, setApps] = useState<App[]>([]);
    const [platform, setPlatform] = useState<'android' | 'ios'>('android');
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        const controller = new AbortController();
        Promise.resolve().then(() => { setValues(readDefaults(userId)); setPlatform(bankPlatform()); });
        Promise.all([
            requestJson<{ wallets: Wallet[] }>('/api/wallets', undefined, controller.signal),
            requestJson<{ images: Image[] }>('/api/receive-qr', undefined, controller.signal),
        ]).then(([w, qr]) => { setWallets(w.wallets); setImages(qr.images); setLoaded(true); })
            .catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => controller.abort();
    }, [userId]);
    useEffect(() => {
        const controller = new AbortController();
        requestJson<{ apps: App[] }>(`/api/vietqr?platform=${platform}`, undefined, controller.signal)
            .then(result => { if (!controller.signal.aborted) setApps(result.apps); }).catch(e => { if (!controller.signal.aborted) setError(e.message); });
        return () => controller.abort();
    }, [platform]);
    function update(key: keyof DefaultPreferences, value: string) {
        try {
            const next = { ...values, [key]: value };
            saveDefaults(userId, next); setValues(next); setError(''); setNotice('Đã lưu trên trình duyệt này.');
        } catch { setError('Không lưu được cài đặt. Kiểm tra quyền lưu trữ của trình duyệt.'); }
    }
    async function primary(id: string) {
        setBusy(true); setNotice(''); setError('');
        try {
            const response = await fetch('/api/receive-qr', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, primary: true }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Không lưu được QR mặc định.');
            setImages(current => current.map(image => ({ ...image, isPrimary: image.id === id })));
            setNotice('Đã lưu QR mặc định cho tài khoản.');
        } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được QR.'); }
        finally { setBusy(false); }
    }
    const appKey = platform === 'ios' ? 'iosApp' : 'androidApp';
    return <section className="card settings-card default-settings">
        <h2 className="settings-title">Cài đặt mặc định</h2>
        <label>Ví ghi thu chi<select aria-label="Ví mặc định" disabled={!loaded} value={wallets.some(w => w.id === values.walletId) ? values.walletId : ''} onChange={e => update('walletId', e.target.value)}>
            <option value="">Ví đầu tiên</option>{wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select></label>
        <label>Thiết bị mở ngân hàng<select value={platform} onChange={e => { setApps([]); setPlatform(e.target.value as 'android' | 'ios'); }}><option value="android">Android</option><option value="ios">iPhone / iPad</option></select></label>
        <label>Ứng dụng ngân hàng<select aria-label="Ngân hàng mặc định" disabled={!apps.length} value={apps.some(a => a.appId === values[appKey]) ? values[appKey] : ''} onChange={e => update(appKey, e.target.value)}>
            <option value="">Ứng dụng đầu tiên</option>{apps.map(a => <option key={a.appId} value={a.appId}>{a.appName}</option>)}
        </select></label>
        <label>QR nhận tiền<select aria-label="QR mặc định" disabled={!loaded || !images.length || busy} value={images.find(image => image.isPrimary)?.id || ''} onChange={e => void primary(e.target.value)}>
            {!images.length && <option value="">Chưa có QR</option>}{images.map(image => <option key={image.id} value={image.id}>{image.label}</option>)}
        </select></label>
        <Link href="/receive-qr">Quản lý QR nhận tiền</Link>
        <p className="defaults-note">Ví và ứng dụng ngân hàng lưu riêng cho tài khoản trên trình duyệt này. QR mặc định đồng bộ theo tài khoản.</p>
        {error && <p role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    </section>;
}
