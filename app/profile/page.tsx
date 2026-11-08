import Link from 'next/link';
import { User } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import AvatarUpload from '../components/AvatarUpload';
import DefaultSettings from './default-settings';
import ThemeSettings from './theme-settings';
import LogoutButton from '../components/LogoutButton';
import RecoveryCodeButton from '../components/RecoveryCodeButton';
import { getCurrentUser } from '../lib/session';
import { rows } from '../lib/db';
import type { RowDataPacket } from 'mysql2/promise';
import '../styles/profile.css';

export default async function Profile() {
  const user = await getCurrentUser();
  const avatars = user ? await rows<RowDataPacket>('SELECT updated_at FROM user_avatars WHERE user_id = ?', [user.id]) : [];

  return (
    <div className="app-page profile-page">
      <header className="profile-header">
        <div><p className="profile-eyebrow">Cài đặt cá nhân</p><h1>Tôi</h1></div>
        {user && <LogoutButton className="profile-logout" />}
      </header>

      {!user && (
          <section className="card guest-card">
            <div className="guest-icon">
              <User size={36} strokeWidth={1.6} />
            </div>
            <div className="guest-details"><h2 className="guest-title">Tài khoản của bạn</h2>
            <p className="guest-text">
              Đăng nhập để lưu và đồng bộ thu chi của bạn trên mọi thiết bị.
            </p></div>

          <div className="profile-actions">
            <Link href="/login" className="btn-primary">
              Đăng nhập
            </Link>
            <Link href="/register" className="btn-secondary">
              Tạo tài khoản
            </Link>
          </div>
          </section>
      )}

      {user && (
        <section className="card profile-hero">
          <AvatarUpload key={user.id} name={user.name} initialSrc={avatars.length ? `/api/avatar?v=${encodeURIComponent(`${user.id}:${avatars[0].updated_at}`)}` : null} />
        </section>
      )}

      <ThemeSettings />

      {user && (
        <section className="card settings-card">
          <h2 className="settings-title">Bảo mật</h2>
          <RecoveryCodeButton />
        </section>
      )}

      {user && <DefaultSettings key={user.id} userId={user.id} />}
      <BottomNav />
    </div>
  );
}
