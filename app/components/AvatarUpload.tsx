'use client';

import React, { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';
import Image from 'next/image';

export default function AvatarUpload({ name, initialSrc }: { name: string; initialSrc: string | null }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [src, setSrc] = useState(initialSrc);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [notice, setNotice] = useState('');

    const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file || busy) return;
        setError(''); setNotice('');
        if (file.size > 2 * 1024 * 1024) { setError('Ảnh quá lớn (tối đa 2 MB).'); return; }
        setBusy(true);
        try {
            const response = await fetch('/api/avatar', { method: 'POST', body: file });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Không thể lưu ảnh đại diện.');
            setSrc(`/api/avatar?v=${crypto.randomUUID()}`);
            setNotice(result.message);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể lưu ảnh đại diện.'); }
        finally { setBusy(false); }
    };

    return (
        <div className="avatar-wrap">
            <button type="button" className="avatar" aria-label="Đổi ảnh đại diện" disabled={busy} aria-busy={busy} onClick={() => inputRef.current?.click()}>
                {src ? <Image src={src} alt="Ảnh đại diện" width={96} height={96} unoptimized /> : <User size={40} strokeWidth={1.6} />}
                <span className="avatar-badge">
                    <Camera size={14} strokeWidth={2} />
                </span>
            </button>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={onPick} />
            <p className="avatar-name">{name}</p>
            {(busy || notice) && <p role="status">{busy ? 'Đang lưu ảnh…' : notice}</p>}
            {error && <p role="alert">{error}</p>}
        </div>
    );
}
