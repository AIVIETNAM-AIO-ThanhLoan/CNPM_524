import Link from 'next/link';
import { User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import AvatarUpload from '../components/AvatarUpload';
import LogoutButton from '../components/LogoutButton';
import RecoveryCodeButton from '../components/RecoveryCodeButton';
import { getCurrentUser } from '../lib/session';
import '../styles/profile.css';

export default async function Profile() {
  const user = await getCurrentUser();

  return (
    <div className="app-page">
      {user && (
        <header className="profile-header">
          <LogoutButton className="profile-logout" />
        </header>
      )}

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

      {user && (
        <section className="card profile-hero">
          <AvatarUpload name={user.name} />
        </section>
      )}

      {user && (
        <section className="card settings-card">
          <h2 className="settings-title">Bảo mật</h2>
          <RecoveryCodeButton />
        </section>
      )}

      <BottomNav />
    </div>
  );
}
