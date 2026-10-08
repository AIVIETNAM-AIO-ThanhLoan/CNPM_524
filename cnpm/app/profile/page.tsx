import Link from 'next/link';
import { Coins, Languages, User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { getCurrentUser } from '../lib/session';
import '../styles/profile.css';

const settings = [
  { Icon: Languages, label: 'Ngôn ngữ', value: 'Tiếng Việt' },
  { Icon: Coins, label: 'Tiền tệ mặc định', value: 'VND' },
];

export default function Profile() {
  // TODO: khi có backend, nếu user không null thì render giao diện đã đăng nhập
  // (tên, tài khoản, bảo mật, đăng xuất). Hiện chỉ có giao diện chưa đăng nhập.
  const user = getCurrentUser();

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
