'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Phone, Wallet } from 'lucide-react';
import GoogleIcon from '../components/GoogleIcon';
import { requestJson } from '../lib/client-api';
import '../styles/auth.css';

export default function LoginPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!account.trim() || !password) {
      setErrorMsg('Vui lòng nhập số điện thoại/email và mật khẩu.');
      return;
    }
    setErrorMsg('');
    setBusy(true);
    try {
      await requestJson('/api/auth/login', { account, password });
      router.push('/profile');
      router.refresh();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Đăng nhập thất bại.');
    } finally { setBusy(false); }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <Wallet className="auth-logo" strokeWidth={1.8} />
        <p className="auth-brand">Ting Ting</p>

        <h1 className="auth-title">Đăng nhập</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
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

          <Link href="/recover" className="auth-forgot">Quên mật khẩu?</Link>

          {errorMsg && <div className="auth-error">{errorMsg}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </form>

        <div className="auth-divider">hoặc</div>

        <button type="button" className="auth-google" disabled title="Chưa cấu hình đăng nhập Google">
          <GoogleIcon />
          Google (sắp có)
        </button>

        <p className="auth-footer">
          Chưa có tài khoản? <Link href="/register">Đăng ký</Link>
        </p>
      </div>
    </div>
  );
}
