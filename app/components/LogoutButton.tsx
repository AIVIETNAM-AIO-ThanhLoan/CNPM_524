'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { requestJson } from '../lib/client-api';

export default function LogoutButton({ className = 'btn-secondary' }: { className?: string }) {
    const router = useRouter();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    async function logout() {
        setBusy(true);
        setError('');
        try {
            await requestJson('/api/auth/logout', {});
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
