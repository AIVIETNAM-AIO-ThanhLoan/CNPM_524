'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, KeyRound, Lock, Phone, Wallet } from 'lucide-react';
import { requestJson } from '../lib/client-api';
import RecoveryCode from '../components/RecoveryCode';
import '../styles/auth.css';

export default function RecoverPage() {
  const router = useRouter();
  const [account, setAccount] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [newCode, setNewCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!account.trim() || !code.trim() || !password) {
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
      const data = await requestJson<{ recoveryCode: string }>('/api/auth/recover', { account, recoveryCode: code, password });
      setNewCode(data.recoveryCode);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Không đặt lại được mật khẩu.');
    } finally { setBusy(false); }
  };

  if (newCode) {
    return (
      <div className="auth-container">
        <div className="auth-content">
          <Wallet className="auth-logo" strokeWidth={1.8} />
          <p className="auth-brand">Chi Tiêu</p>

          <h1 className="auth-title">Đã đặt lại mật khẩu</h1>
          <p className="auth-subtitle">Mã cũ đã hết hiệu lực. Hãy lưu mã khôi phục mới này.</p>

          <div className="auth-form">
            <RecoveryCode code={newCode} />
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

        <h1 className="auth-title">Quên mật khẩu</h1>
        <p className="auth-subtitle">Nhập mã khôi phục bạn đã lưu khi đăng ký</p>

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
            <KeyRound className="auth-field-icon" />
            <input
              className="auth-input"
              type="text"
              placeholder="Mã khôi phục (XXXX-XXXX-XXXX-XXXX)"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
            />
          </div>

          <div className="auth-field">
            <Lock className="auth-field-icon" />
            <input
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="Mật khẩu mới"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
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
              placeholder="Xác nhận mật khẩu mới"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          {errorMsg && <div className="auth-error">{errorMsg}</div>}

          <button type="submit" className="auth-submit" disabled={busy}>
            {busy ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}
          </button>
        </form>

        <p className="auth-footer">
          Nhớ mật khẩu rồi? <Link href="/login">Đăng nhập</Link>
        </p>
      </div>
    </div>
  );
}
