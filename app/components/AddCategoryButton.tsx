'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X } from 'lucide-react';
import { type Category, requestJson } from '../lib/client-api';
import '../styles/category-dialog.css';

export default function AddCategoryButton({ kind, onAdded, disabled = false }: { kind: Category['kind']; onAdded: (category: Category) => void; disabled?: boolean }) {
    const dialog = useRef<HTMLDialogElement>(null);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    useEffect(() => {
        if (open && !dialog.current?.open) dialog.current?.showModal();
    }, [open]);

    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        event.stopPropagation();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        const name = String(form.get('name') || '').trim();
        if (!name) { setError('Vui lòng nhập tên danh mục.'); return; }
        setBusy(true); setError('');
        try {
            const { id } = await requestJson<{ id: string }>('/api/categories', { name, kind });
            onAdded({ id, name, kind });
            setOpen(false);
        } catch (error) { setError(error instanceof Error ? error.message : 'Không thể thêm danh mục.'); }
        finally { setBusy(false); }
    }

    return <>
        <button type="button" className="add-category-button" disabled={disabled} onClick={() => { setError(''); setOpen(true); }}>
            <Plus size={17} aria-hidden="true" /> Thêm danh mục
        </button>
        {open && createPortal(<dialog ref={dialog} className="category-dialog" aria-labelledby="category-dialog-title"
            onCancel={(event) => { if (busy) event.preventDefault(); else setOpen(false); }} onClose={() => setOpen(false)}>
            <div className="category-dialog-header"><h2 id="category-dialog-title">Thêm danh mục</h2>
                <button type="button" className="icon-btn" aria-label="Đóng" disabled={busy} onClick={() => setOpen(false)}><X size={20} /></button>
            </div>
            <p>Danh mục {kind === 'expense' ? 'chi tiêu' : 'thu nhập'} này sẽ có trong phần Ghi giao dịch{kind === 'expense' ? ' và Ngân sách' : ''}.</p>
            <form className="ledger-form" onSubmit={submit}>
                <label>Tên danh mục<input name="name" maxLength={80} placeholder="Ví dụ: Sức khỏe" required autoFocus /></label>
                {error && <p className="category-error" role="alert">{error}</p>}
                <div className="category-dialog-actions"><button type="button" className="btn-secondary" disabled={busy} onClick={() => setOpen(false)}>Hủy</button>
                    <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Đang thêm…' : 'Tạo danh mục'}</button></div>
            </form>
        </dialog>, document.body)}
    </>;
}
