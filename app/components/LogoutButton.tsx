'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '../lib/client-api';
import { askConfirm } from './ConfirmDialog';
import { activeAccount, clearActiveAccount, pendingEntries } from '../lib/offline';

export default function LogoutButton({ className = 'btn-secondary' }: { className?: string }) {
    const router = useRouter();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function logout() {
        setBusy(true);
        setError('');
        try {
            const account = await activeAccount();
            const pending = account ? await pendingEntries(account.userId) : [];
            if (pending.length && !await askConfirm({ title: 'Đăng xuất khi còn giao dịch chưa gửi?', message: `Còn ${pending.length} giao dịch chưa gửi. Các khoản này vẫn được giữ trên thiết bị; đăng nhập lại đúng tài khoản để đồng bộ. Không xóa dữ liệu trình duyệt.`, confirmLabel: 'Đăng xuất', cancelLabel: 'Ở lại', danger: true })) return;
            const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
            const subscription = await registration?.pushManager?.getSubscription();
            await requestJson('/api/auth/logout', { endpoint: subscription?.endpoint });
            await subscription?.unsubscribe();
            await clearActiveAccount();
            router.refresh();
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể đăng xuất.'); }
        finally { setBusy(false); }
    }
    return (
        <>
            <button type="button" className={className} onClick={logout} disabled={busy}>Đăng xuất</button>
            {error && <p role="alert" className="data-status">{error}</p>}
        </>
    );
}
