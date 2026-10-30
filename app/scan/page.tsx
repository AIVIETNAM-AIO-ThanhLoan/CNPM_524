'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
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
    const [platform, setPlatform] = useState('android');
    const [options, setOptions] = useState<Options>({ banks: [], apps: [] });
    const [app, setApp] = useState('');
    const [qr, setQr] = useState('');
    const [recipient, setRecipient] = useState<Recipient | null>(null);
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [reviewed, setReviewed] = useState(false);
    const [url, setUrl] = useState('');
    const [error, setError] = useState('');
    const [scanning, setScanning] = useState(false);
    const [busy, setBusy] = useState(false);
    const [online, setOnline] = useState(true);
    const stop = useCallback(() => { generation.current++; stream.current?.getTracks().forEach((track) => track.stop()); stream.current = null; setScanning(false); }, []);
    useEffect(() => {
        const offline = () => { setOnline(navigator.onLine); if (!navigator.onLine) { stop(); setUrl(''); } };
        const hidden = () => { if (document.visibilityState === 'hidden') stop(); };
        Promise.resolve().then(() => { setOnline(navigator.onLine); if (/iPad|iPhone|iPod/.test(navigator.userAgent)) setPlatform('ios'); });
        window.addEventListener('offline', offline); window.addEventListener('online', offline); document.addEventListener('visibilitychange', hidden);
        return () => { stop(); window.removeEventListener('offline', offline); window.removeEventListener('online', offline); document.removeEventListener('visibilitychange', hidden); };
    }, [stop]);
    useEffect(() => {
        const controller = new AbortController();
        requestJson<Options>(`/api/vietqr?platform=${platform}`, undefined, controller.signal).then((options) => { if (!controller.signal.aborted) { setOptions(options); setApp(options.apps[0]?.appId || ''); setError(''); } })
            .catch((error) => { if (!controller.signal.aborted) { setOptions({ banks: [], apps: [] }); setError(error.message); } });
        return () => controller.abort();
    }, [platform]);
    function decode(value: string) {
        setUrl(''); setReviewed(false);
        try {
            const decoded = parseVietQR(value);
            setQr(value); setRecipient(decoded); setAmount(decoded.amount); setNote(decoded.note); setError(''); stop();
        } catch (error) { setRecipient(null); setError(error instanceof Error ? error.message : 'Mã QR không hợp lệ.'); }
    }
    async function start() {
        setError(''); setUrl(''); setRecipient(null); stop();
        if (!navigator.onLine) { setError('Quét VietQR cần kết nối mạng.'); return; }
        if (!navigator.mediaDevices?.getUserMedia || !window.isSecureContext) { setError('Camera cần HTTPS và trình duyệt hỗ trợ. Bạn có thể dán nội dung QR bên dưới.'); return; }
        const current = generation.current;
        try {
            const camera = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } }, audio: false });
            if (current !== generation.current) { camera.getTracks().forEach((track) => track.stop()); return; }
            stream.current = camera;
            if (!video.current) { stop(); return; }
            video.current.srcObject = camera;
            await video.current.play(); setScanning(true);
            // jsQR chạy trên luồng chính nên mỗi khung chỉ giải mã tối đa 480×480 để camera không bị giật trên điện thoại.
            // Các khung xen kẽ: cả ô vuông giữa (QR to) và nửa giữa ở độ phân giải gốc (QR nhỏ hoặc ở xa);
            // ảnh đảo màu chỉ thử thỉnh thoảng thay vì mỗi khung hai lần.
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            let attempt = 0;
            const scan = () => {
                if (current !== generation.current || !navigator.onLine || !video.current || !context) return;
                const { videoWidth, videoHeight } = video.current;
                if (video.current.readyState >= 2 && videoWidth && videoHeight) {
                    const side = Math.min(videoWidth, videoHeight);
                    const region = attempt % 2 ? Math.round(side / 2) : side, size = Math.min(region, 480);
                    if (canvas.width !== Math.min(side, 480)) { canvas.width = Math.min(side, 480); canvas.height = canvas.width; }
                    context.drawImage(video.current, (videoWidth - region) / 2, (videoHeight - region) / 2, region, region, 0, 0, size, size);
                    const pixels = context.getImageData(0, 0, size, size);
                    let result = null;
                    // jsQR đôi khi ném lỗi với khung hình nhiễu; bỏ qua khung đó để vòng quét không dừng hẳn.
                    try { result = jsQR(pixels.data, size, size, { inversionAttempts: attempt % 8 >= 6 ? 'onlyInvert' : 'dontInvert' }); } catch { /* quét tiếp khung sau */ }
                    attempt++;
                    if (result) { decode(result.data); stop(); return; }
                }
                setTimeout(scan, 150);
            };
            scan();
        } catch { stop(); setError('Không mở được camera. Hãy cho phép quyền camera và thử lại.'); }
    }
    async function createLink(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault(); setUrl(''); setError('');
        if (!navigator.onLine || !reviewed) { setError('Cần mạng và xác nhận đã kiểm tra người nhận.'); return; }
        setBusy(true);
        try { const data = await requestJson<{ url: string }>('/api/vietqr', { qr, platform, app, amount, note }); setUrl(data.url); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không mở được liên kết.'); }
        finally { setBusy(false); }
    }
    const selectedApp = options.apps.find((item) => item.appId === app);
    const bank = options.banks.find((item) => item.bin === recipient?.bankBin);
    return <main className="app-page ledger-page">
        <header className="page-header"><h1>Quét VietQR</h1></header>
        <p>Cần kết nối mạng. Kiểm tra thông tin trong ứng dụng ngân hàng trước khi trả tiền. Ting Ting không tự ghi giao dịch và không xác định thanh toán thành công khi bạn quay lại.</p>
        {!online && <p role="alert">Đang ngoại tuyến. VietQR chỉ dùng khi có mạng.</p>}
        {error && <p role="alert" className="ledger-error">{error} <Link href="/login">Đăng nhập</Link></p>}
        <section className="card ledger-form">
            <video ref={video} playsInline muted autoPlay aria-label="Camera quét VietQR" style={{ width: '100%', maxHeight: 320, display: scanning ? 'block' : 'none' }} />
            <div className="action-row"><button className="btn-primary" disabled={!online || scanning} onClick={start}>Bật camera quét VietQR</button><button className="btn-secondary" onClick={stop} disabled={!scanning}>Dừng camera</button></div>
            <details><summary>Dán nội dung QR nếu không dùng camera</summary><form className="ledger-form" onSubmit={(event) => { event.preventDefault(); decode(String(new FormData(event.currentTarget).get('qr'))); }}>
                <label>Nội dung VietQR<textarea name="qr" maxLength={2048} required /></label><button className="btn-secondary" disabled={!online}>Kiểm tra VietQR</button>
            </form></details>
        </section>
        {recipient && <form className="card ledger-form" onSubmit={createLink}>
            <h2>Kiểm tra người nhận</h2>
            <p>Ngân hàng: {bank ? `${bank.shortName} · ${bank.name}` : `Chưa nhận diện (BIN ${recipient.bankBin})`}</p>
            <p>Số tài khoản: <strong>{recipient.account}</strong></p>
            <p>Tên trong QR: {recipient.name || 'Không có'}. Tên này chưa được ngân hàng xác minh.</p>
            <label>Số tiền chuyển (VND)<input type="number" min="1" max="999999999999" step="1" required value={amount} onChange={(e) => { setAmount(e.target.value); setUrl(''); }} /></label>
            <label>Nội dung chuyển<input maxLength={99} required value={note} onChange={(e) => { setNote(e.target.value); setUrl(''); }} /></label>
            <label>Thiết bị<select aria-label="Thiết bị" value={platform} onChange={(e) => { setPlatform(e.target.value); setUrl(''); }}><option value="android">Android</option><option value="ios">iOS</option></select></label>
            <label>Ứng dụng ngân hàng<select aria-label="Ứng dụng ngân hàng" value={app} required onChange={(e) => { setApp(e.target.value); setUrl(''); }}>{options.apps.map((item) => <option value={item.appId} key={item.appId}>{item.appName}</option>)}</select></label>
            <p>{selectedApp?.autofill ? 'Ứng dụng này được VietQR báo hỗ trợ tự điền trên hệ điều hành đã chọn.' : 'Ứng dụng này có thể chỉ mở app; bạn có thể cần nhập lại thông tin hoặc quét QR trong app.'} Khả năng tự điền tùy phiên bản app, thiết bị và dịch vụ VietQR.</p>
            <label className="review-check"><input type="checkbox" required checked={reviewed} onChange={(e) => { setReviewed(e.target.checked); setUrl(''); }} />Tôi đã kiểm tra ngân hàng, số tài khoản, số tiền và nội dung.</label>
            <button className="btn-primary" disabled={busy || !online || !bank || !reviewed}>Tạo liên kết mở ứng dụng</button>
            {url && online && reviewed && <a className="btn-primary" href={url}>Mở {selectedApp?.appName}</a>}
            <a href="https://www.vietqr.io/deeplink" target="_blank" rel="noreferrer">Thông tin hỗ trợ VietQR Deep Link</a>
        </form>}
        <BottomNav />
    </main>;
}
