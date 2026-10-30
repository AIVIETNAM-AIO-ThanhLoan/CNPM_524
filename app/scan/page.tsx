'use client';
import { useCallback, useEffect, useEffectEvent, useRef, useState } from 'react';
import Link from 'next/link';
import jsQR from 'jsqr';
import BottomNav from '../components/BottomNav';
import { requestJson } from '../lib/client-api';
import { parseVietQR } from '../lib/vietqr.mjs';
import '../styles/scan.css';

type Recipient = { bankBin: string; account: string; name: string; amount: string; note: string };
type Options = { banks: { bin: string; name: string; shortName: string }[]; apps: { appId: string; appName: string; autofill: number }[] };
export default function Scan() {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const generation = useRef(0);
    const [platform, setPlatform] = useState('');
    const [options, setOptions] = useState<Options>({ banks: [], apps: [] });
    const [app, setApp] = useState('');
    const [qr, setQr] = useState('');
    const [recipient, setRecipient] = useState<Recipient | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [reviewed, setReviewed] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [optionsError, setOptionsError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [readingImage, setReadingImage] = useState(false);
    const [online, setOnline] = useState(true);
    const stop = useCallback(() => { generation.current++; stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setScanning(false); }, []);
    const resumeCamera = useEffectEvent(() => { if (!recipient && !readingImage && navigator.onLine && document.visibilityState === 'visible') void start(); });
    useEffect(() => {
        const offline = () => { setOnline(navigator.onLine); if (!navigator.onLine) { stop(); setUrl(''); } else resumeCamera(); };
        const hidden = () => { if (document.visibilityState === 'hidden') stop(); else resumeCamera(); };
        Promise.resolve().then(() => { setOnline(navigator.onLine); setPlatform(/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'android'); });
        window.addEventListener('offline', offline); window.addEventListener('online', offline); document.addEventListener('visibilitychange', hidden);
        return () => { stop(); window.removeEventListener('offline', offline); window.removeEventListener('online', offline); document.removeEventListener('visibilitychange', hidden); };
    }, [stop]);
    useEffect(() => {
        if (!platform || !online) return;
        const controller = new AbortController();
        requestJson<Options>(`/api/vietqr?platform=${platform}`, undefined, controller.signal).then((options) => { if (!controller.signal.aborted) { setOptions(options); setApp(options.apps[0]?.appId || ''); setOptionsError(''); } })
            .catch((error) => { if (!controller.signal.aborted) { setOptions({ banks: [], apps: [] }); setOptionsError(error.message); } });
        return () => controller.abort();
    }, [platform, online]);
    function decode(value: string) {
        if (!navigator.onLine) { setError('Quét VietQR cần kết nối mạng.'); return; }
        setUrl(''); setReviewed(false);
        try {
            const decoded = parseVietQR(value);
            setQr(value); setRecipient(decoded); setAmount(decoded.amount); setNote(decoded.note); setError(''); stop();
        } catch (error) { setRecipient(null); setError(error instanceof Error ? error.message : 'Mã QR không hợp lệ.'); }
    }
    async function readImage(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.currentTarget.files?.[0];
        event.currentTarget.value = '';
        if (!file) return;
        stop(); setUrl(''); setRecipient(null); setReviewed(false); setError('');
        if (!navigator.onLine) { setError('Quét VietQR cần kết nối mạng.'); return; }
        if (!file.type.startsWith('image/') || file.size > 10 * 1024 * 1024) { setError('Hãy chọn ảnh QR có dung lượng tối đa 10 MB.'); return; }
        const current = generation.current;
        const source = URL.createObjectURL(file);
        setReadingImage(true);
        try {
            const image = new Image(); image.src = source; await image.decode();
            if (current !== generation.current) return;
            const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error();
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
            const result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: 'attemptBoth' });
            if (result) decode(result.data);
            else setError('Không tìm thấy mã QR trong ảnh. Hãy chọn ảnh rõ nét, có đủ bốn góc của mã.');
        } catch { if (current === generation.current) setError('Không đọc được ảnh. Hãy chọn ảnh PNG hoặc JPG rõ nét và thử lại.'); }
        finally { URL.revokeObjectURL(source); setReadingImage(false); }
    }
    async function start() {
        setError(''); setUrl(''); setRecipient(null); stop();
        if (!navigator.onLine) { setError('Quét VietQR cần kết nối mạng.'); return; }
        if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setError('Không thể mở camera trên kết nối này. Hãy chọn ảnh QR hoặc Chuyển tiền.'); return; }
        const current = generation.current;
        try {
            const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
            if (current !== generation.current) { camera.getTracks().forEach((track) => track.stop()); return; }
            stream.current = camera;
            if (!video.current) { stop(); return; }
            video.current.srcObject = camera;
            setScanning(true); await video.current.play();
            if (current !== generation.current) { camera.getTracks().forEach((track) => track.stop()); return; }
            // Alternate full-frame and centered crops so off-center QR codes stay visible without decoding full-resolution video.
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            let attempt = 0;
            const scan = () => {
                if (current !== generation.current || !navigator.onLine || !video.current || !context) return;
                const { videoWidth, videoHeight } = video.current;
                if (video.current.readyState >= 2 && videoWidth && videoHeight) {
                    const side = Math.min(videoWidth, videoHeight);
                    const region = attempt % 3 === 2 ? Math.round(side / 2) : side;
                    const width = attempt % 3 === 0 ? videoWidth : region, height = attempt % 3 === 0 ? videoHeight : region;
                    const scale = Math.min(1, (attempt % 3 === 0 ? 640 : 480) / Math.max(width, height));
                    canvas.width = Math.max(1, Math.round(width * scale)); canvas.height = Math.max(1, Math.round(height * scale));
                    context.drawImage(video.current, (videoWidth - width) / 2, (videoHeight - height) / 2, width, height, 0, 0, canvas.width, canvas.height);
                    const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
                    let result = null;
                    // jsQR đôi khi ném lỗi với khung hình nhiễu; bỏ qua khung đó để vòng quét không dừng hẳn.
                    try { result = jsQR(pixels.data, pixels.width, pixels.height, { inversionAttempts: attempt % 8 >= 6 ? 'onlyInvert' : 'dontInvert' }); } catch { /* quét tiếp khung sau */ }
                    attempt++;
                    if (result) { decode(result.data); stop(); return; }
                }
                setTimeout(scan, 150);
            };
            scan();
        } catch (error) {
            if (current !== generation.current) return;
            stop();
            const reason = error instanceof DOMException ? error.name : '';
            setError(reason === 'NotAllowedError' ? 'Quyền camera đang bị chặn. Hãy cho phép camera trong cài đặt trang hoặc dùng Chọn ảnh QR.'
                : reason === 'NotFoundError' ? 'Không tìm thấy camera. Bạn có thể dùng Chọn ảnh QR.'
                    : 'Không mở được camera. Hãy đóng ứng dụng khác đang dùng camera rồi thử lại, hoặc dùng Chọn ảnh QR.');
        }
    }
    const openCamera = useEffectEvent(start);
    useEffect(() => { const timer = setTimeout(() => openCamera(), 0); return () => clearTimeout(timer); }, []);
    useEffect(() => {
        if (recipient && qr) document.getElementById('transfer-amount')?.focus();
    }, [recipient, qr]);
    async function createLink(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setUrl(''); setError('');
        if (!navigator.onLine || !reviewed) { setError('Cần mạng và xác nhận đã kiểm tra người nhận.'); return; }
        setBusy(true);
        try { const data = await requestJson<{ url: string }>('/api/vietqr', { qr: qr || undefined, bankBin: recipient?.bankBin, account: recipient?.account, platform, app, amount, note }); setUrl(data.url); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không mở được liên kết.'); }
        finally { setBusy(false); }
    }
    const selectedApp = options.apps.find((item) => item.appId === app);
    const bank = options.banks.find((item) => item.bin === recipient?.bankBin);
    const displayedError = online ? error || optionsError : '';
    function manualTransfer() {
        stop(); setQr(''); setAmount(''); setNote(''); setUrl(''); setReviewed(false); setError('');
        setRecipient({ bankBin: '', account: '', name: '', amount: '', note: '' });
    }
    return <main className="app-page ledger-page scan-page">
        <header className="page-header"><h1>Quét VietQR</h1></header>
        {!online && <p role="alert">Đang ngoại tuyến. VietQR chỉ dùng khi có mạng.</p>}
        {displayedError && <p role="alert" className="ledger-error">{displayedError} {displayedError === 'Bạn cần đăng nhập.' && <Link href="/login">Đăng nhập</Link>}</p>}
        <section className="card ledger-form" style={{ display: recipient ? 'none' : undefined }}>
            <video ref={video} playsInline muted autoPlay aria-label="Camera quét VietQR" style={{ width: '100%', maxHeight: 320, display: scanning ? 'block' : 'none' }} />
            <label className="btn-secondary scan-upload">Chọn ảnh QR<input aria-label="Chọn ảnh QR" className="scan-file" type="file" accept="image/*" disabled={!online || readingImage} onChange={readImage} /></label>
            {readingImage && <p role="status">Đang đọc ảnh QR…</p>}
            <button type="button" className="btn-secondary" disabled={!online || readingImage} onClick={manualTransfer}>Chuyển tiền</button>
        </section>
        {recipient && <form className="card ledger-form" onSubmit={createLink}>
            <div className="scan-review-heading"><h2>{qr ? 'Kiểm tra người nhận' : 'Chuyển tiền'}</h2><button type="button" className="btn-secondary" onClick={start} disabled={!online}>Quét mã khác</button></div>
            {qr ? <dl className="scan-recipient">
                <div><dt>Ngân hàng</dt><dd>{bank ? bank.shortName : `BIN ${recipient.bankBin}`}</dd></div>
                <div><dt>Số tài khoản</dt><dd>{recipient.account}</dd></div>
                <div><dt>Tên trong QR</dt><dd>{recipient.name || 'Không có tên trong mã'}</dd></div>
            </dl> : <>
                <label>Ngân hàng nhận<select aria-label="Ngân hàng nhận" required value={recipient.bankBin} onChange={(e) => { setRecipient({ ...recipient, bankBin: e.target.value }); setReviewed(false); setUrl(''); }}>
                    <option value="">Chọn ngân hàng</option>
                    {options.banks.map((item) => <option key={item.bin} value={item.bin}>{item.shortName} · {item.name}</option>)}
                </select></label>
                <label>Số tài khoản nhận<input inputMode="numeric" pattern="[0-9]{4,34}" maxLength={34} required value={recipient.account} onChange={(e) => { setRecipient({ ...recipient, account: e.target.value }); setReviewed(false); setUrl(''); }} /></label>
            </>}
            <label>Số tiền chuyển (VND)<input id="transfer-amount" inputMode="numeric" placeholder="Nhập số tiền" type="number" min="1" max="999999999999" step="1" required value={amount} onChange={(e) => { setAmount(e.target.value); setReviewed(false); setUrl(''); }} /></label>
            <label>Nội dung chuyển<input maxLength={99} required value={note} onChange={(e) => { setNote(e.target.value); setReviewed(false); setUrl(''); }} /></label>
            <label>Ứng dụng ngân hàng<select aria-label="Ứng dụng ngân hàng" value={app} required onChange={(e) => { setApp(e.target.value); setUrl(''); }}>{options.apps.map((item) => <option value={item.appId} key={item.appId}>{item.appName}</option>)}</select></label>
            <label className="review-check"><input type="checkbox" required checked={reviewed} onChange={(e) => { setReviewed(e.target.checked); setUrl(''); }} />Tôi đã kiểm tra ngân hàng, số tài khoản, số tiền và nội dung.</label>
            <button className="btn-primary" disabled={busy || !online || !bank || !reviewed}>Tạo liên kết mở ứng dụng</button>
            {url && online && reviewed && <a className="btn-primary" href={url}>Mở {selectedApp?.appName}</a>}
        </form>}
        <BottomNav onNavigate={stop} />
    </main>;
}
