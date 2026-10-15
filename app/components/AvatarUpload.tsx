'use client';

import React, { useRef, useState } from 'react';
import { Camera, User } from 'lucide-react';

// Chỉ xem trước ảnh trên trình duyệt. TODO: tải ảnh lên server khi có chức năng lưu ảnh đại diện.
export default function AvatarUpload({ name }: { name: string }) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [src, setSrc] = useState<string | null>(null);

    const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => setSrc(typeof reader.result === 'string' ? reader.result : null);
        reader.readAsDataURL(file);
    };

    return (
        <div className="avatar-wrap">
            <button type="button" className="avatar" aria-label="Đổi ảnh đại diện" onClick={() => inputRef.current?.click()}>
                {src ? <img src={src} alt="" /> : <User size={40} strokeWidth={1.6} />}
                <span className="avatar-badge">
                    <Camera size={14} strokeWidth={2} />
                </span>
            </button>
            <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
            <p className="avatar-name">{name}</p>
        </div>
    );
}
