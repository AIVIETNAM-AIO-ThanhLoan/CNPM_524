'use client';
import { useCallback, useEffect, useState } from 'react';
import { activeAccount, onOfflineChange, type OfflineAccount } from '../lib/offline';
import TransactionForm from '../transactions/new/transaction-form';

export default function OfflinePage() {
    const [account, setAccount] = useState<OfflineAccount | null>(null);
    const [error, setError] = useState('Đang mở dữ liệu trên thiết bị…');
    const load = useCallback(() => { activeAccount().then((account) => { setAccount(account); setError(account ? '' : 'Hãy đăng nhập khi có mạng ít nhất một lần để chuẩn bị ví và danh mục ngoại tuyến.'); }).catch((error) => setError(error.message)); }, []);
    useEffect(() => { load(); return onOfflineChange(load); }, [load]);
    return account ? <TransactionForm key={account.userId} userId={account.userId} initialWallets={account.wallets} initialCategories={account.categories} />
        : <main className="app-page ledger-page"><header className="page-header"><h1>Ghi giao dịch ngoại tuyến</h1></header><p role="status">{error}</p><a className="btn-secondary" href="/login">Đăng nhập khi có mạng</a></main>;
}
