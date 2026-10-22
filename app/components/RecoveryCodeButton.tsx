'use client';

import { useState } from 'react';
import { requestJson } from '../lib/client-api';
import RecoveryCode from './RecoveryCode';

// Tạo mã khôi phục mật khẩu mới (dành cho tài khoản tạo trước khi có tính năng, hoặc khi làm mất mã)
export default function RecoveryCodeButton() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError('');
    try {
      const data = await requestJson<{ recoveryCode: string }>('/api/auth/recovery-code', { password });
      setCode(data.recoveryCode);
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không tạo được mã.');
    } finally { setBusy(false); }
  };

  if (code) {
    return (
      <div className="flex flex-col gap-2 py-3">
        <p className="text-sm text-ink">Mã khôi phục mới, mã cũ đã hết hiệu lực. Hãy lưu lại để đặt lại mật khẩu khi quên.</p>
        <RecoveryCode code={code} />
      </div>
    );
  }

  if (!open) {
    return (
      <div className="profile-actions">
        <button type="button" className="btn-secondary" onClick={() => setOpen(true)}>Tạo mã khôi phục mật khẩu</button>
      </div>
    );
  }

  return (
    <form className="flex flex-col gap-2 py-3" onSubmit={submit}>
      <label className="text-sm text-ink" htmlFor="recovery-password">Nhập mật khẩu hiện tại để tạo mã mới</label>
      <input
        id="recovery-password"
        className="rounded-xl border border-line px-3 py-2"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
      />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="profile-actions">
        <button type="button" className="btn-secondary" onClick={() => { setOpen(false); setError(''); }}>Hủy</button>
        <button type="submit" className="btn-primary" disabled={busy || !password}>{busy ? 'Đang tạo…' : 'Tạo mã'}</button>
      </div>
    </form>
  );
}
