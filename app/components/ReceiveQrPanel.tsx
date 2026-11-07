'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton, SkeletonStatus } from './Skeleton';
import { requestJson } from '../lib/client-api';
import '../styles/ledger.css';
import '../styles/receive-qr.css';

type QrImage = { id: string; label: string; isPrimary: boolean | number; updatedAt: string };

const IMAGE_LIMIT = 2 * 1024 * 1024;
// updatedAt chỉ chính xác đến giây; version tăng sau mỗi thao tác để ảnh vừa thay luôn được tải lại.
const imageUrl = (image: QrImage, version: number) => `/api/receive-qr?id=${image.id}&v=${encodeURIComponent(image.updatedAt)}-${version}`;

// Ảnh PNG/JPEG/WebP nhỏ gửi nguyên bản để QR giữ nét; ảnh lớn hoặc định dạng khác (HEIC...) thu về JPEG tối đa 1600px.
async function prepare(file: File): Promise<Blob> {
    if (['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && file.size <= IMAGE_LIMIT) return file;
    const bitmap = await createImageBitmap(file).catch(() => { throw new Error('Không đọc được ảnh này. Hãy chọn ảnh PNG hoặc JPEG.'); });
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Trình duyệt không xử lý được ảnh.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    if (!blob || blob.size > IMAGE_LIMIT) throw new Error('Ảnh quá lớn (tối đa 2 MB).');
    return blob;
}

async function send(method: string, url: string, body: Blob | Record<string, unknown>) {
    const response = await fetch(url, body instanceof Blob
        ? { method, headers: { 'Content-Type': body.type || 'application/octet-stream' }, body }
        : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không thể xử lý yêu cầu.');
    return data as { id: string };
}

export default function ReceiveQrPanel() {
    const [images, setImages] = useState<QrImage[]>([]);
    const [selectedId, setSelectedId] = useState('');
    const [loaded, setLoaded] = useState(false);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [version, setVersion] = useState(0);
    const addInput = useRef<HTMLInputElement>(null);
    const replaceInput = useRef<HTMLInputElement>(null);
    const labelInput = useRef<HTMLInputElement>(null);

    const load = useCallback(async (select?: string) => {
        try {
            const list = (await requestJson<{ images: QrImage[] }>('/api/receive-qr')).images;
            setImages(list); setError('');
            setSelectedId((current) => select && list.some((item) => item.id === select) ? select
                : list.some((item) => item.id === current) ? current : list[0]?.id || '');
        } catch (err) { setError(err instanceof Error ? err.message : 'Không tải được ảnh QR.'); }
        finally { setLoaded(true); }
    }, []);
    useEffect(() => { void Promise.resolve().then(() => load()); }, [load]);

    const selected = images.find((item) => item.id === selectedId);

    async function run(work: () => Promise<string | undefined>) {
        if (busy) return;
        setBusy(true); setError('');
        try { await load(await work()); setVersion((value) => value + 1); }
        catch (err) { setError(err instanceof Error ? err.message : 'Không thể xử lý yêu cầu.'); }
        finally { setBusy(false); }
    }

    function add(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        const label = labelInput.current?.value.trim() || `QR ${images.length + 1}`;
        void run(async () => {
            const { id } = await send('POST', `/api/receive-qr?label=${encodeURIComponent(label)}`, await prepare(file));
            if (labelInput.current) labelInput.current.value = '';
            return id;
        });
    }

    function replace(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file || !selected) return;
        void run(async () => (await send('PUT', `/api/receive-qr?id=${selected.id}`, await prepare(file))).id);
    }

    function makePrimary() {
        if (selected) void run(async () => (await send('PATCH', '/api/receive-qr', { id: selected.id, primary: true })).id);
    }

    function remove() {
        if (selected && confirm(`Xóa ảnh "${selected.label}"?`)) void run(async () => { await send('DELETE', '/api/receive-qr', { id: selected.id }); return undefined; });
    }

    const addForm = <>
        <label>Tên ảnh (không bắt buộc)<input ref={labelInput} maxLength={60} placeholder="Ví dụ: Vietcombank" /></label>
        <button type="button" className="btn-primary" disabled={busy || images.length >= 10} onClick={() => addInput.current?.click()}>{busy ? 'Đang xử lý...' : 'Chọn ảnh QR'}</button>
        <p>Tối đa 10 ảnh, mỗi ảnh tối đa 2 MB. Có thể dùng ảnh chụp màn hình QR từ app ngân hàng.</p>
        <input ref={addInput} type="file" accept="image/*" hidden onChange={add} />
    </>;

    return <>
        {error && <p role="alert" className="ledger-error">{error} <Link href="/login">Đăng nhập</Link></p>}

        {!loaded && <section className="card receive-qr-main"><SkeletonStatus label="Đang tải ảnh QR…" /><Skeleton width={240} height={240} /><Skeleton width={120} /></section>}

        {selected && <section className="card receive-qr-main">
            <Image unoptimized width={1600} height={1600} src={imageUrl(selected, version)} alt={`Mã QR ${selected.label}`} />
            <p className="receive-qr-label">{selected.label}{selected.isPrimary ? <span className="receive-qr-badge">Ảnh chính</span> : null}</p>
            <p className="receive-qr-hint">Đưa mã này để người khác quét chuyển tiền cho bạn</p>
            {!selected.isPrimary && <button type="button" className="btn-primary receive-qr-make-primary" disabled={busy} onClick={makePrimary}>Đặt làm ảnh chính</button>}
            <div className="receive-qr-actions">
                <button type="button" className="btn-secondary" disabled={busy} onClick={() => replaceInput.current?.click()}>Thay ảnh</button>
                <button type="button" className="btn-secondary receive-qr-delete" disabled={busy} onClick={remove}>Xóa</button>
            </div>
            <input ref={replaceInput} type="file" accept="image/*" hidden onChange={replace} />
        </section>}

        {images.length > 1 && <section className="receive-qr-thumbs" aria-label="Các ảnh QR đã lưu">
            {images.map((image) => <button type="button" key={image.id} className={image.id === selectedId ? 'is-selected' : ''} aria-pressed={image.id === selectedId} onClick={() => setSelectedId(image.id)}>
                <Image unoptimized width={80} height={80} src={imageUrl(image, version)} alt="" />
                <span>{image.label}</span>
            </button>)}
        </section>}

        {loaded && (images.length
            ? <details className="card ledger-form receive-qr-add"><summary>Thêm ảnh QR khác</summary><div className="ledger-form">{addForm}</div></details>
            : <section className="card ledger-form">
                <h2>Bạn chưa lưu ảnh QR nào</h2>
                <p>Lưu ảnh QR tài khoản ngân hàng để đưa người khác quét khi nhận tiền.</p>
                {addForm}
            </section>)}
    </>;
}
