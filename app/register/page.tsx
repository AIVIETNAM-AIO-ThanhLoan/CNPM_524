'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Phone, User, Wallet } from 'lucide-react';
import GoogleIcon from '../components/GoogleIcon';
import { requestJson } from '../lib/client-api';
import RecoveryCode from '../components/RecoveryCode';
import '../styles/auth.css';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!fullName.trim() || !account.trim() || !password) {
      setErrorMsg('Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (password.length < 8 || password.length > 128) {
      setErrorMsg('Mật khẩu cần từ 8 đến 128 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.');
      return;
    }
    setErrorMsg('');
    setBusy(true);
    try {
      const data = await requestJson<{ recoveryCode: string }>('/api/auth/register', { name: fullName, account, password });
      // Hiện mã khôi phục trước khi chuyển sang đăng nhập vì mã chỉ trả về một lần
      setRecoveryCode(data.recoveryCode);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Đăng ký thất bại.');
    } finally { setBusy(false); }
  };

  if (recoveryCode) {
    return (
      <div className="auth-container">
        <div className="auth-content">
          <Wallet className="auth-logo" strokeWidth={1.8} />
          <p className="auth-brand">Chi Tiêu</p>

          <h1 className="auth-title">Lưu mã khôi phục</h1>
          <p className="auth-subtitle">Dùng mã này để đặt lại mật khẩu khi bạn quên. Mã chỉ hiện một lần.</p>

          <div className="auth-form">
            <RecoveryCode code={recoveryCode} />
            <button type="button" className="auth-submit" onClick={() => router.push('/login')}>
              Tôi đã lưu mã, đăng nhập
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-content">
        <Wallet className="auth-logo" strokeWidth={1.8} />
        <p className="auth-brand">Chi Tiêu</p>

        <h1 className="auth-title">Đăng ký</h1>
        <p className="auth-subtitle">Tạo tài khoản mới</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <User className="auth-field-icon" />
            <input
              className="auth-input"
              type="text"
              placeholder="Họ và tên"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <Phone className="auth-field-icon" />
            <input
              className="auth-input"
              type="text"
              placeholder="Số điện thoại hoặc email"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <Lock className="auth-field-icon" />
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="auth-field">
            <Lock className="auth-field-icon" />
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Xác nhận mật khẩu"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {errorMsg && <div className="auth-error">{errorMsg}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Đang tạo tài khoản…' : 'Đăng ký'}
          </button>
        </form>

        <div className="auth-divider">hoặc</div>

        <button type="button" className="auth-google" disabled title="Chưa cấu hình đăng nhập Google">
          <GoogleIcon />
          Google (sắp có)
        </button>

        <p className="auth-footer">
          Đã có tài khoản? <Link href="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
