'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { House, Plus, WifiOff } from 'lucide-react';
import { activeAccount, onOfflineChange, type OfflineAccount } from '../lib/offline';
import { useOnline } from '../lib/use-online';
import TransactionForm from '../transactions/new/transaction-form';
import PendingEntries from '../components/PendingEntries';

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
    if (account && pathname === '/') return <main className="app-page offline-page offline-home">
        <header className="offline-home-header"><House size={24} aria-hidden="true" /><h1>Trang chủ</h1></header>
        <section className="card offline-wallets" aria-labelledby="offline-wallet-title">
            <h2 id="offline-wallet-title">Số dư đã lưu trên thiết bị</h2>
            <ul>{account.wallets.map(wallet => <li key={wallet.id}><span>{wallet.name}</span><strong>{Number(wallet.balance).toLocaleString('vi-VN', { style: 'currency', currency: wallet.currency || 'VND' })}</strong></li>)}</ul>
        </section>
        <button className="btn-primary offline-home-entry" onClick={() => navigateOffline('/transactions/new')}><Plus size={20} aria-hidden="true" />Ghi giao dịch</button>
        <PendingEntries userId={account.userId} hideWhenEmpty />
        {online && <button className="btn-secondary offline-home-entry" onClick={() => window.location.reload()}>Cập nhật trang chủ</button>}
    </main>;
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
