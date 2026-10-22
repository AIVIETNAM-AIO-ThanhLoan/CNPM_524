'use client';

import { useState } from 'react';

// Hiện mã khôi phục kèm nút chép; mã chỉ trả về một lần nên nhắc người dùng lưu lại
export default function RecoveryCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).then(() => setCopied(true), () => setCopied(false));
  };
  return (
    <div className="flex flex-col gap-2">
      <code className="recovery-code" data-testid="recovery-code">{code}</code>
      <button type="button" className="btn-secondary" onClick={copy}>
        {copied ? 'Đã chép mã' : 'Chép mã'}
      </button>
    </div>
  );
}
