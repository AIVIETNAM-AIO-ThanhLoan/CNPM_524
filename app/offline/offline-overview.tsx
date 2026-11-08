'use client';

import { useState } from 'react';
import type { OfflineAccount } from '../lib/offline';
import { formatDate } from '../lib/client-api';
import PendingEntries from '../components/PendingEntries';

const sections = [['/', 'Trang chủ'], ['/history', 'Lịch sử'], ['/wallets', 'Ví'], ['/reports', 'Báo cáo'], ['/budgets', 'Ngân sách'], ['/goals', 'Mục tiêu']] as const;
const money = (value: string | number, currency = 'VND') => Number(value).toLocaleString('vi-VN', { style: 'currency', currency });

export default function OfflineOverview({ account, pathname, navigate, online }: { account: OfflineAccount; pathname: string; navigate: (path: string) => void; online: boolean }) {
    const [search, setSearch] = useState('');
    const snapshot = account.snapshot;
    const current = sections.find(([path]) => path === pathname);
    const title = current?.[1] || 'Dữ liệu ngoại tuyến';
    const home = pathname === '/' || !current;
    const transactions = snapshot?.finance.transactions.filter(item => `${item.note} ${item.category || ''} ${item.wallet}`.toLocaleLowerCase('vi').includes(search.toLocaleLowerCase('vi'))) || [];
    return <main className="app-page offline-page offline-home">
        <header className="offline-home-header"><h1>{title}</h1></header>
        <nav className="offline-sections" aria-label="Dữ liệu ngoại tuyến">
            {sections.map(([path, label]) => <button key={path} className="btn-secondary" aria-current={pathname === path ? 'page' : undefined} onClick={() => navigate(path)}>{label}</button>)}
        </nav>
        <p className="offline-saved">{snapshot ? `Đã lưu lúc ${new Date(snapshot.savedAt).toLocaleString('vi-VN')}. Số liệu chưa bao gồm giao dịch chờ đồng bộ.` : 'Chưa tải bản xem chi tiết. Kết nối mạng để cập nhật; ví và giao dịch chờ vẫn được giữ.'}</p>
        {(home || pathname === '/wallets') && <section className="card offline-wallets">
            <h2>Số dư đã lưu trên thiết bị</h2>
            <ul>{account.wallets.map(wallet => <li key={wallet.id}><span>{wallet.name}</span><strong>{money(wallet.balance, wallet.currency || 'VND')}</strong></li>)}</ul>
            {!account.wallets.length && <p>Chưa có ví.</p>}
        </section>}
        {snapshot && (home || pathname === '/reports') && <section className="card offline-wallets">
            <h2>Thu chi từ {formatDate(snapshot.start)} đến {formatDate(snapshot.end)}</h2>
            <ul><li><span>Tổng thu</span><strong>{money(snapshot.finance.income)}</strong></li><li><span>Tổng chi</span><strong>{money(snapshot.finance.expense)}</strong></li></ul>
            {pathname === '/reports' && <ul>{snapshot.finance.breakdown.map((item, index) => <li key={index}><span>{item.name} · {item.kind === 'income' ? 'Thu' : 'Chi'}</span><strong>{money(item.amount)}</strong></li>)}</ul>}
        </section>}
        {snapshot && pathname === '/history' && <section className="card offline-wallets ledger-form">
            <h2>Giao dịch từ {formatDate(snapshot.start)} đến {formatDate(snapshot.end)}</h2>
            <label>Tìm trong lịch sử đã lưu<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Ghi chú, danh mục, ví" /></label>
            <ul>{transactions.map(item => <li key={item.id}><div><strong>{item.note || item.category || 'Chuyển khoản'}</strong><p>{formatDate(item.bookedOn)} · {item.wallet}{item.target ? ` → ${item.target}` : ''}</p><p>{item.kind === 'income' ? 'Thu nhập' : item.kind === 'expense' ? 'Chi tiêu' : 'Chuyển khoản'}{item.reversesId ? ' · Bút toán đảo' : item.reversed ? ' · Đã đảo' : ''}</p></div><strong>{money(item.amount)}</strong></li>)}</ul>
            {!transactions.length && <p>Không có giao dịch phù hợp trong dữ liệu đã lưu.</p>}
            {snapshot.finance.hasMore && <p>Chỉ lưu 200 giao dịch mới nhất trong khoảng thời gian này. Kết nối mạng để xem đầy đủ.</p>}
        </section>}
        {snapshot && pathname === '/budgets' && <section className="card offline-wallets">
            <h2>Ngân sách tháng {snapshot.start.slice(0, 7)}</h2>
            <ul>{snapshot.budgets.map(item => <li key={item.categoryId}><span>{item.name}</span><div>Đã chi {money(item.spent)}<br />Hạn mức {money(item.amount)}</div></li>)}</ul>
            {!snapshot.budgets.length && <p>Chưa có ngân sách trong bản đã lưu.</p>}
        </section>}
        {snapshot && pathname === '/goals' && <section className="card offline-wallets">
            <h2>Mục tiêu tiết kiệm</h2>
            <ul>{snapshot.goals.map(item => <li key={item.id}><div><strong>{item.name}</strong><p>{item.status === 'achieved' ? 'Đã đạt' : item.status === 'closed' ? 'Đã đóng' : 'Đang thực hiện'}{item.dueOn ? ` · ${formatDate(item.dueOn)}` : ''}</p></div><div>Đã góp {money(item.savedAmount)}<br />Mục tiêu {money(item.targetAmount)}</div></li>)}</ul>
            {!snapshot.goals.length && <p>Chưa có mục tiêu trong bản đã lưu.</p>}
        </section>}
        <button className="btn-primary offline-home-entry" onClick={() => navigate('/transactions/new')}>Ghi giao dịch</button>
        <PendingEntries userId={account.userId} hideWhenEmpty />
        {online && <a className="btn-secondary offline-home-entry" href={pathname === '/wallets' ? '/manage' : current ? pathname : '/'}>Mở trang trực tuyến</a>}
    </main>;
}
