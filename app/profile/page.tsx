import Link from 'next/link';
import { Coins, Languages, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { getCurrentUser } from '../lib/session';
import { wallets } from '../lib/ledger';
import LogoutButton from '../components/LogoutButton';
import '../styles/profile.css';

const settings = [
  { Icon: Languages, label: 'Ngôn ngữ', value: 'Tiếng Việt' },
  { Icon: Coins, label: 'Tiền tệ mặc định', value: 'VND' },
];

export default async function Profile() {
  const user = await getCurrentUser();
  const accounts = user ? await wallets(user.id) : [];

  return (
    <div className="app-page">
      <header className="page-header">
        <h1 className="page-title">Tôi</h1>
      </header>

      {!user && (
        <>
          <section className="card guest-card">
            <div className="guest-icon">
              <User size={36} strokeWidth={1.6} />
            </div>
            <h2 className="guest-title">Bạn chưa đăng nhập</h2>
            <p className="guest-text">
              Đăng nhập để lưu và đồng bộ thu chi của bạn trên mọi thiết bị.
            </p>
          </section>

          <div className="profile-actions">
            <Link href="/login" className="btn-primary">
              Đăng nhập
            </Link>
            <Link href="/register" className="btn-secondary">
              Tạo tài khoản
            </Link>
          </div>
        </>
      )}

      {user && <section className="card settings-card">
        <h2 className="settings-title">{user.name}</h2>
        <p>{user.account}</p>
        <h3 className="section-title">Ví của tôi</h3>
        {accounts.map((wallet) => <div className="settings-row" key={wallet.id}>
          <span>{wallet.name}</span><strong>{Number(wallet.balance).toLocaleString('vi-VN')}đ</strong>
        </div>)}
        <div className="profile-actions"><Link className="btn-primary" href="/transactions/new">Ghi giao dịch / thêm ví</Link></div>
        <LogoutButton />
      </section>}

      <section className="card settings-card">
        <h2 className="settings-title">Cài đặt chung</h2>
        {settings.map(({ Icon, label, value }) => (
          <div key={label} className="settings-row">
            <span className="settings-label">
              <Icon size={20} strokeWidth={1.8} />
              {label}
            </span>
            <span className="settings-value">{value}</span>
          </div>
        ))}
      </section>

      <BottomNav />
    </div>
  );
}
