'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, RefreshCw, ShieldCheck, Users } from 'lucide-react';
import { requestJson } from '../lib/client-api';
import '../styles/admin.css';

type Backup = { id: number; status: 'success' | 'failed'; startedAt: string; filePath: string | null; sizeBytes: number | null; error: string | null };
type Stats = { users: { total: number; blocked: number; admins: number; twoFactor: number }; transactions: { total: number; last30Days: number }; exchangeRates: { total: number; lastRateDate: string | null }; backups: Backup[] };
type Account = { id: string; name: string; account: string; role: string; blocked: boolean; twoFactor: boolean };
type Rate = { base: string; quote: string; date: string; rate: string };
const tabs = [{ id: 'overview', label: 'Tổng quan hệ thống' }, { id: 'currencies', label: 'Quản lý Tỷ giá' }, { id: 'users', label: 'Quản lý Người dùng' }, { id: 'backups', label: 'Sao lưu & Khôi phục' }] as const;

export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<string>('overview');
    const [revision, setRevision] = useState(0);
    const [query, setQuery] = useState('');
    const [search, setSearch] = useState('');
    const [data, setData] = useState<{ stats: Stats; users: Account[]; rates: Rate[] } | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const controller = new AbortController();
        Promise.all([
            requestJson<Stats>('/api/admin/stats', undefined, controller.signal),
            requestJson<{ users: Account[] }>(`/api/admin/users?q=${encodeURIComponent(query)}`, undefined, controller.signal),
            requestJson<{ rates: Rate[] }>('/api/admin/rates', undefined, controller.signal),
        ]).then(([stats, users, rates]) => {
            if (!controller.signal.aborted) { setData({ stats, ...users, ...rates }); setError(''); }
        }).catch((error) => {
            if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Không thể tải dữ liệu quản trị.');
        }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [revision, query]);

    async function change(url: string, body: unknown) {
        if (busy) return;
        setBusy(true); setNotice(''); setError('');
        try {
            const result = await requestJson<{ message: string }>(url, body);
            setNotice(result.message); setRevision((n) => n + 1);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể thực hiện thao tác.'); }
        finally { setBusy(false); }
    }

    const backups = data?.stats.backups ?? [];
    return <div className="admin-page min-h-screen bg-white text-ink flex flex-col">
        <header className="bg-ink text-white">
            <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                <h1 className="font-bold flex items-center gap-2"><ShieldCheck size={22} />Quản trị Ting Ting</h1>
                <Link href="/profile" className="underline">Về tài khoản</Link>
            </div>
        </header>
        <nav className="admin-tabs border-b border-line" aria-label="Quản trị">
            <div className="max-w-7xl mx-auto px-4 flex gap-4">
                {tabs.map((tab) => <button key={tab.id} type="button" aria-pressed={activeTab === tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`py-4 border-b-2 ${activeTab === tab.id ? 'border-brand text-brand' : 'border-transparent text-muted'}`}>{tab.label}</button>)}
            </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 py-6 w-full space-y-5">
            {loading && <p role="status">Đang tải dữ liệu quản trị…</p>}
            {error && <p role="alert" className="text-danger">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => setRevision((n) => n + 1)}><RefreshCw size={16} />Làm mới dữ liệu</button>
            {data && activeTab === 'overview' && <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Tổng người dùng', value: data.stats.users.total, icon: Users },
                        { label: 'Tổng giao dịch', value: data.stats.transactions.total, icon: CreditCard },
                        { label: 'Tỷ giá đã lưu', value: data.stats.exchangeRates.total, icon: RefreshCw },
                        { label: 'Tài khoản bị khóa', value: data.stats.users.blocked, icon: ShieldCheck },
                    ].map(({ label, value, icon: Icon }) => <section key={label} className="border border-line rounded-xl p-5 flex justify-between gap-3">
                        <div><h2 className="text-sm text-muted">{label}</h2><p className="text-2xl font-bold">{value.toLocaleString('vi-VN')}</p></div><Icon size={24} />
                    </section>)}
                </div>
                <p>{data.stats.users.twoFactor} tài khoản đã bật xác thực hai bước. Có {data.stats.transactions.last30Days} giao dịch trong 30 ngày qua.</p>
                <h2 className="text-lg font-bold">Sao lưu gần nhất</h2>
                <p>{backups[0] ? `${backups[0].filePath || 'Chưa tạo được file'} · ${backups[0].status === 'success' ? 'Thành công' : 'Thất bại'}` : 'Chưa có bản sao lưu.'}</p>
            </>}
            {data && activeTab === 'users' && <section className="space-y-4">
                <h2 className="text-lg font-bold">Danh sách tài khoản</h2>
                <form className="flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); setQuery(search.trim()); }}>
                    <input className="border border-line rounded-lg p-3 flex-1 min-w-0" aria-label="Tìm người dùng" value={search} maxLength={100} onChange={(event) => setSearch(event.target.value)} placeholder="Tên hoặc tài khoản" />
                    <button type="submit" className="btn-secondary">Tìm kiếm</button>
                </form>
                {!data.users.length ? <p>Không tìm thấy người dùng.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead><tr><th className="p-3">Người dùng</th><th className="p-3">Vai trò</th><th className="p-3">Bảo mật</th><th className="p-3">Trạng thái</th><th className="p-3">Thao tác</th></tr></thead>
                    <tbody>{data.users.map((user) => <tr key={user.id} className="border-t border-line">
                        <td className="p-3"><strong>{user.name}</strong><p>{user.account}</p></td><td className="p-3">{user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</td>
                        <td className="p-3">{user.twoFactor ? 'Đã bật 2FA' : 'Chưa bật 2FA'}</td><td className="p-3">{user.blocked ? 'Đã khóa' : 'Đang hoạt động'}</td>
                        <td className="p-3"><button type="button" className="btn-secondary" disabled={busy || user.role === 'admin'} onClick={() => change('/api/admin/users', { userId: user.id, blocked: !user.blocked })}>{user.blocked ? 'Mở khóa' : 'Khóa'}</button></td>
                    </tr>)}</tbody>
                </table></div>}
                <p className="text-sm text-muted">Hiển thị tối đa 200 tài khoản phù hợp. Khóa tài khoản sẽ kết thúc các phiên đăng nhập của người đó.</p>
            </section>}
            {data && activeTab === 'currencies' && <section className="space-y-4">
                <h2 className="text-lg font-bold">Tỷ giá đã lưu</h2>
                <button type="button" className="btn-primary" disabled={busy} onClick={() => change('/api/admin/rates', {})}>{busy ? 'Đang đồng bộ…' : 'Đồng bộ tỷ giá ngay'}</button>
                <p className="text-sm text-muted">Nguồn đồng bộ: ExchangeRate-API. Lịch sử giao dịch giữ nguyên số tiền đã ghi.</p>
                {!data.rates.length ? <p>Chưa có tỷ giá được lưu.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead><tr><th className="p-3">Cặp tiền</th><th className="p-3">Tỷ giá</th><th className="p-3">Ngày tỷ giá</th></tr></thead>
                    <tbody>{data.rates.map((rate) => <tr key={`${rate.base}:${rate.quote}`} className="border-t border-line"><td className="p-3">{rate.base} / {rate.quote}</td><td className="p-3">{Number(rate.rate).toLocaleString('vi-VN', { maximumFractionDigits: 8 })}</td><td className="p-3">{rate.date}</td></tr>)}</tbody>
                </table></div>}
            </section>}
            {data && activeTab === 'backups' && <section className="space-y-4">
                <h2 className="text-lg font-bold">Lịch sử sao lưu database</h2>
                <p>Sao lưu và khôi phục được thực hiện bằng công cụ quản trị trên máy chủ. Trang này hiển thị kết quả 10 lần sao lưu gần nhất.</p>
                {!backups.length ? <p>Chưa có bản sao lưu.</p> : <div className="overflow-x-auto"><table className="w-full text-left text-sm">
                    <thead><tr><th className="p-3">Thời điểm (UTC)</th><th className="p-3">File</th><th className="p-3">Dung lượng</th><th className="p-3">Kết quả</th></tr></thead>
                    <tbody>{backups.map((backup) => <tr key={backup.id} className="border-t border-line"><td className="p-3">{backup.startedAt}</td><td className="p-3 break-all">{backup.filePath || '—'}</td><td className="p-3">{backup.sizeBytes === null ? '—' : `${backup.sizeBytes.toLocaleString('vi-VN')} byte`}</td><td className="p-3">{backup.status === 'success' ? 'Thành công' : 'Thất bại'}{backup.error && <p>{backup.error}</p>}</td></tr>)}</tbody>
                </table></div>}
            </section>}
        </main>
    </div>;
}
