'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { WifiOff } from 'lucide-react';
import { activeAccount, onOfflineChange, type OfflineAccount } from '../lib/offline';
import { useOnline } from '../lib/use-online';
import TransactionForm from '../transactions/new/transaction-form';
import OfflineOverview from './offline-overview';

export default function OfflinePage() {
    const online = useOnline();
    const pathname = usePathname();
    const router = useRouter();
    const [account, setAccount] = useState<OfflineAccount | null>(null);
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const load = useCallback(() => { activeAccount().then((account) => { setAccount(account); setError(''); setLoaded(true); }).catch((error) => { setError(error.message); setLoaded(true); }); }, []);
    useEffect(() => { load(); return onOfflineChange(load); }, [load]);
    function navigateOffline(path: string) {
        window.history.pushState(null, '', path);
        window.scrollTo(0, 0);
    }
    if (account && pathname !== '/offline' && pathname !== '/transactions/new') return <OfflineOverview account={account} pathname={pathname} navigate={navigateOffline} online={online} />;
    return account ? <TransactionForm key={account.userId} userId={account.userId} initialWallets={account.wallets} initialCategories={account.categories}
        onBack={() => online ? router.push('/') : navigateOffline('/')} />
        : <main className="app-page offline-page"><section className="offline-empty" aria-busy={!loaded}>
            <WifiOff size={36} aria-hidden="true" />
            <h1>{!loaded ? 'Đang mở dữ liệu trên thiết bị…' : error ? 'Không mở được dữ liệu' : 'Chưa có dữ liệu ngoại tuyến'}</h1>
            <p role="status">{error || (loaded ? 'Kết nối mạng rồi đăng nhập để chuẩn bị ví và danh mục trên thiết bị này.' : 'Vui lòng chờ trong giây lát.')}</p>
            {error && <button className="btn-secondary" onClick={load}>Thử lại</button>}
            {(!loaded || error) && <Link className="btn-secondary" href="/" prefetch={false}>Mở lại ứng dụng</Link>}
            {loaded && online && <a className="btn-primary" href="/login">Đăng nhập</a>}
        </section></main>;
}
