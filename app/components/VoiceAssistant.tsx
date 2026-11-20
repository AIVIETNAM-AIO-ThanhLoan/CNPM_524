'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, X, PlusCircle, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { formatDate, requestJson, type Wallet, type Category, today } from '@/app/lib/client-api';
import { notifyFinanceUpdated } from '@/app/lib/finance-updates';
import { parseVoiceAmount, removeVoiceAmount } from '@/app/lib/voice-amount.mjs';
import '@/app/styles/voice.css';


type Recognition = {
  continuous: boolean; interimResults: boolean; lang: string;
  onstart: (() => void) | null;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type VoicePayload = {
  requestKey: string; kind: 'income' | 'expense'; walletId: string;
  targetId: null; categoryId: string; amount: string; bookedOn: string; note: string;
};
function abortRecognition(recognition: Recognition | null) {
  if (!recognition) return;
  recognition.onstart = null; recognition.onresult = null;
  recognition.onerror = null; recognition.onend = null;
  try { recognition.abort(); } catch { /* Already stopped. */ }
}
const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

// Trình duyệt chỉ hỏi quyền micro một lần; đã chặn hoặc không hỗ trợ thì không hiện hộp hỏi nên phải báo rõ cách xử lý.
const VOICE_ERRORS: Record<string, string> = {
  'not-allowed': 'Micro đang bị chặn nên trình duyệt không hỏi lại. Hãy bấm biểu tượng cạnh thanh địa chỉ, cho phép Micro rồi tải lại trang.',
  'service-not-allowed': 'Thiết bị không cho dùng nhận giọng nói ở đây. Hãy nhập vào ô bên dưới; trên điện thoại có thể bấm micro của bàn phím để đọc.',
  'audio-capture': 'Không tìm thấy micro. Hãy kiểm tra micro của thiết bị.',
  'no-speech': 'Không nghe thấy tiếng nói. Hãy bấm micro và nói lại.',
  network: 'Không kết nối được dịch vụ nhận giọng nói. Hãy kiểm tra mạng rồi thử lại.',
};

export default function VoiceAssistant({ className = 'btn-secondary', label = 'Giọng nói' }: { className?: string; label?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [typed, setTyped] = useState('');
  const [isHomeScreenIos, setIsHomeScreenIos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [pendingPayload, setPendingPayload] = useState<VoicePayload | null>(null);
  const [missingCategoryName, setMissingCategoryName] = useState('');
  // Giao dịch đã nhận diện, chờ người dùng xem lại rồi mới lưu (nguyên lý Ít gây bất ngờ).
  const [review, setReview] = useState<{ payload: VoicePayload; categoryName: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const recognitionRef = useRef<Recognition | null>(null);
  const dataRequest = useRef<AbortController | null>(null);
  const openRef = useRef(false);
  const processing = useRef(false);
  const retryRequest = useRef<{ fingerprint: string; requestKey: string } | null>(null);

  useEffect(() => {
    if (isOpen && dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }, [isOpen]);

  useEffect(() => () => {
    openRef.current = false;
    dataRequest.current?.abort();
    abortRecognition(recognitionRef.current);
  }, []);

  function stopRecognition() {
    const recognition = recognitionRef.current;
    recognitionRef.current = null;
    abortRecognition(recognition);
    setIsStarting(false);
    setIsListening(false);
  }

  async function openAssistant() {
    if (processing.current) return;
    stopRecognition();
    dataRequest.current?.abort();
    const controller = new AbortController();
    dataRequest.current = controller;
    openRef.current = true;
    setIsOpen(true); setIsDataLoaded(false); setError(''); setSaved('');
    setTranscript(''); setTyped(''); setPendingPayload(null); setMissingCategoryName(''); setReview(null);
    setIsHomeScreenIos((navigator as Navigator & { standalone?: boolean }).standalone === true);
    try {
      const [wRes, cRes] = await Promise.all([
        requestJson<{ wallets: Wallet[] }>('/api/wallets', undefined, controller.signal),
        requestJson<{ categories: Category[] }>('/api/categories', undefined, controller.signal),
      ]);
      if (controller.signal.aborted || !openRef.current) return;
      if (!wRes.wallets.length) throw new Error('Bạn cần tạo ví trước khi ghi giao dịch bằng giọng nói.');
      setWallets(wRes.wallets); setCategories(cRes.categories); setIsDataLoaded(true);
    } catch (error) {
      if (!controller.signal.aborted && openRef.current) setError(!navigator.onLine
        ? 'Nhập bằng giọng nói cần có mạng. Khi mất mạng, hãy dùng Ghi giao dịch.'
        : errorMessage(error, 'Không thể tải dữ liệu. Vui lòng thử lại.'));
    }
  }

  function closeAssistant() {
    // A request already sent may be committed; wait for its outcome before closing.
    if (processing.current) return;
    openRef.current = false;
    dataRequest.current?.abort();
    stopRecognition();
    setIsOpen(false);
  }

  async function executeSave(payload: VoicePayload, categoryName: string) {
    const { requestKey, ...content } = payload;
    const fingerprint = JSON.stringify(content);
    const key = retryRequest.current?.fingerprint === fingerprint ? retryRequest.current.requestKey : requestKey;
    retryRequest.current = { fingerprint, requestKey: key };
    try {
      await requestJson('/api/transactions', { ...payload, requestKey: key });
      retryRequest.current = null;
      notifyFinanceUpdated();
      router.refresh();
      if (!openRef.current) return;
      const walletName = wallets.find(w => w.id === payload.walletId)?.name;
      setSaved(`Đã ghi ${payload.kind === 'income' ? 'khoản thu' : 'khoản chi'} ${Number(payload.amount).toLocaleString('vi-VN')}đ · ${categoryName} · ${walletName}`);
      setPendingPayload(null); setMissingCategoryName(''); setTyped(''); setReview(null);
    } catch (error) {
      if (openRef.current) setError(errorMessage(error, 'Lỗi khi lưu giao dịch.'));
    }
  }

  function extractCategoryName(text: string) {
    let cleanText = removeVoiceAmount(text);
    wallets.forEach(w => { cleanText = cleanText.split(w.name.normalize('NFC').toLowerCase()).join(''); });
    cleanText = cleanText.replace(/thu nhập|nhận được|đồng|vnd|\d+/g, '');
    cleanText = cleanText.replace(/(cho|vào|ví|tài khoản|mua|chi|thu|nhận|lương|tiền)\s+/g, '');
    cleanText = cleanText.replace(/[.,/#!$%\^&*;:{}=\-_`~()]/g, '');
    const name = cleanText.trim().replace(/\s+/g, ' ');
    return name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  }

  async function processVoiceText(text: string) {
    if (!openRef.current || processing.current || !isDataLoaded) return;
    processing.current = true;
    setLoading(true); setError(''); setSaved(''); setTranscript(text); setReview(null);
    try {
      const wallet = wallets.find(w => text.includes(w.name.normalize('NFC').toLowerCase())) || wallets[0];
      if (!wallet) throw new Error('Bạn cần tạo ví trước khi ghi giao dịch.');
      const amount = parseVoiceAmount(text);
      if (!Number.isSafeInteger(amount) || amount < 1000 || amount >= 1e12) {
        throw new Error('Không nhận diện được số tiền hợp lệ. Hãy nói số dương kèm đơn vị, ví dụ: ăn uống 50 nghìn.');
      }
      const available = categories.filter(c => !c.archived);
      const category = [...available].sort((a, b) => b.name.length - a.name.length)
        .find(c => text.includes(c.name.normalize('NFC').toLowerCase()));
      const kind = category?.kind || (/thu nhập|nhận|lương/.test(text) ? 'income' : 'expense');
      const payload: VoicePayload = { requestKey: crypto.randomUUID(), kind, walletId: wallet.id,
        targetId: null, categoryId: category?.id || '', amount: amount.toFixed(2), bookedOn: today(), note: `Ghi âm: ${text}`.slice(0, 500) };
      if (category) {
        setReview({ payload, categoryName: category.name });
      } else {
        const guessedName = extractCategoryName(text);
        if (guessedName.length > 1 && guessedName !== 'Khác') {
          setMissingCategoryName(guessedName); setPendingPayload(payload);
        } else {
          const fallback = available.find(c => c.kind === kind && c.name.toLowerCase().includes('khác'))
            || available.find(c => c.kind === kind);
          if (!fallback) throw new Error('Không tìm thấy danh mục phù hợp để lưu.');
          setReview({ payload: { ...payload, categoryId: fallback.id }, categoryName: fallback.name });
        }
      }
    } catch (error) {
      if (openRef.current) setError(errorMessage(error, 'Không thể xử lý giao dịch.'));
    } finally {
      processing.current = false;
      if (openRef.current) setLoading(false);
    }
  }

  async function saveReview() {
    if (!review || processing.current || !openRef.current) return;
    processing.current = true; setLoading(true); setError('');
    try { await executeSave(review.payload, review.categoryName); }
    finally {
      processing.current = false;
      if (openRef.current) setLoading(false);
    }
  }

  function discardReview() {
    if (processing.current) return;
    setReview(null); setError(''); setTranscript('');
  }

  function toggleListening() {
    if (!isDataLoaded || processing.current || !openRef.current) return;
    if (isListening) { recognitionRef.current?.stop(); return; }
    if (isStarting) { stopRecognition(); return; }
    stopRecognition();
    setError(''); setSaved(''); setTranscript('');
    setPendingPayload(null); setMissingCategoryName(''); setReview(null);
    if (!window.isSecureContext) {
      setError('Micro chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ HTTPS.'); return;
    }
    const browser = window as Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
    const Constructor = browser.SpeechRecognition || browser.webkitSpeechRecognition;
    if (!Constructor) { setError('Trình duyệt này không hỗ trợ nhận giọng nói. Hãy mở bằng Chrome hoặc nhập chữ bên dưới.'); return; }
    let answered = false;
    const recognition = new Constructor();
    const active = () => openRef.current && recognitionRef.current === recognition;
    recognition.continuous = false; recognition.interimResults = false; recognition.lang = 'vi-VN';
    recognition.onstart = () => { if (active()) { setIsStarting(false); setIsListening(true); } };
    recognition.onresult = (event) => {
      if (!active() || answered) return;
      answered = true;
      const text = event.results[0]?.[0]?.transcript?.trim().normalize('NFC').toLowerCase();
      stopRecognition();
      if (text) void processVoiceText(text); else setError(VOICE_ERRORS['no-speech']);
    };
    recognition.onerror = (event) => {
      if (!active()) return;
      answered = true;
      stopRecognition();
      if (event.error !== 'aborted') setError(VOICE_ERRORS[event.error] || `Lỗi micro: ${event.error}`);
    };
    recognition.onend = () => {
      if (!active()) return;
      stopRecognition();
      if (!answered) setError(VOICE_ERRORS['no-speech']);
    };
    recognitionRef.current = recognition;
    setIsStarting(true);
    try { recognition.start(); } catch (error) {
      stopRecognition();
      setError(error instanceof Error && error.name === 'NotAllowedError' ? VOICE_ERRORS['not-allowed'] : 'Không bật được micro. Hãy đóng hộp thoại và thử lại.');
    }
  }

  function submitTyped(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = typed.trim().normalize('NFC').toLowerCase();
    if (!text || processing.current || !isDataLoaded) return;
    stopRecognition();
    void processVoiceText(text);
  }

  async function handleCreateCategory() {
    if (!pendingPayload || !missingCategoryName || processing.current || !openRef.current) return;
    processing.current = true; setLoading(true); setError('');
    try {
      const isMissing = (c: Category) => c.name.toLowerCase() === missingCategoryName.toLowerCase() && c.kind === pendingPayload.kind;
      let category = categories.find(isMissing);
      if (!category) {
        await requestJson('/api/categories', { name: missingCategoryName, kind: pendingPayload.kind });
        const response = await requestJson<{ categories: Category[] }>('/api/categories');
        if (!openRef.current) return;
        setCategories(response.categories);
        category = response.categories.find(isMissing);
      }
      if (!category) throw new Error('Đã tạo danh mục nhưng không thể lấy được ID.');
      await executeSave({ ...pendingPayload, categoryId: category.id }, category.name);
    } catch (error) {
      if (openRef.current) setError(errorMessage(error, 'Không thể tạo danh mục mới.'));
    } finally {
      processing.current = false;
      if (openRef.current) setLoading(false);
    }
  }

  const reviewWallet = review ? wallets.find(w => w.id === review.payload.walletId)?.name : '';
  const saveLabel = review?.payload.kind === 'income' ? 'Lưu khoản thu' : 'Lưu khoản chi';

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={openAssistant}
        aria-label="Nhập giao dịch bằng giọng nói"
        title="Nhập giao dịch bằng giọng nói"
      >
        <Mic size={18} strokeWidth={1.8} />
        {label}
      </button>

      {isOpen && (
        <dialog ref={dialogRef} className="app-dialog voice-dialog" aria-label="Trợ lý giọng nói"
          // Esc luôn đóng hộp thoại mà không lưu; chỉ chờ khi một yêu cầu lưu đang được gửi.
          onCancel={(event) => { event.preventDefault(); closeAssistant(); }}>
          <div className="app-dialog-header">
            <h2>Trợ lý giọng nói</h2>
            <button type="button" className="icon-btn" aria-label="Đóng trợ lý giọng nói" disabled={loading} onClick={closeAssistant}><X size={22} /></button>
          </div>

          {/* MÀN HÌNH GHI ÂM CHÍNH */}
          {!pendingPayload && !review && (
            <>
              <div className="voice-hint">
                <p>Bạn có thể nói:</p>
                <p><strong>&quot;Ăn uống 50 nghìn&quot;</strong></p>
                <p><strong>&quot;Mua sách 200k&quot;</strong> (hỏi tạo danh mục)</p>
                <p><strong>&quot;50 nghìn&quot;</strong> (vào danh mục Khác)</p>
              </div>

              {error && <p role="alert" className="app-dialog-error voice-center">{error}</p>}
              {error && !isDataLoaded && <button type="button" className="btn-secondary voice-retry" onClick={openAssistant}>Thử lại</button>}
              {isHomeScreenIos && <p className="voice-notice">App cài trên iPhone có thể không nhận giọng được. Hãy bấm ô nhập bên dưới, rồi dùng micro của bàn phím để đọc.</p>}
              {saved && <p role="status" className="voice-saved">{saved}</p>}
              {transcript && <p className="voice-transcript">Bạn đã nói: &quot;{transcript}&quot;</p>}

              <div className="voice-mic-area">
                <button
                  type="button"
                  className={`voice-mic${isListening ? ' is-listening' : ''}`}
                  aria-label={isListening ? 'Dừng ghi âm' : isStarting ? 'Hủy bật micro' : 'Bắt đầu ghi âm'}
                  onClick={toggleListening}
                  disabled={loading || !isDataLoaded}
                >
                  <Mic size={32} />
                </button>
                <p role="status" className="voice-status">
                  {loading ? 'Đang xử lý...' : isListening ? 'Đang nghe...' : isStarting ? 'Đang bật micro... Nếu trình duyệt hỏi quyền, hãy chọn Cho phép.' : 'Bấm Micro để nói'}
                </p>
              </div>

              <form onSubmit={submitTyped} className="voice-typed">
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  aria-label="Nhập giao dịch bằng chữ"
                  placeholder="Hoặc nhập: ăn uống 50 nghìn"
                  enterKeyHint="done"
                />
                <button type="submit" className="btn-primary" disabled={loading || !isDataLoaded || !typed.trim()}>Ghi</button>
              </form>
            </>
          )}

          {/* MÀN HÌNH XEM LẠI: chỉ lưu khi người dùng bấm Lưu */}
          {review && (
            <section aria-label="Kiểm tra giao dịch" className="voice-review">
              <p className="app-dialog-text">Kiểm tra lại trước khi lưu. Nếu ứng dụng nghe nhầm, bấm Nói lại.</p>
              <div className="voice-review-card">
                <p className="voice-review-kind">{review.payload.kind === 'income' ? 'Khoản thu' : 'Khoản chi'}</p>
                <p className={`voice-review-amount ${review.payload.kind === 'income' ? 'text-income' : 'text-expense'}`}>
                  {Number(review.payload.amount).toLocaleString('vi-VN')}đ
                </p>
                <dl>
                  <div><dt>Danh mục</dt><dd>{review.categoryName}</dd></div>
                  <div><dt>{review.payload.kind === 'income' ? 'Nhận vào' : 'Nguồn chi'}</dt><dd>{reviewWallet}</dd></div>
                  <div><dt>Ngày</dt><dd>{formatDate(review.payload.bookedOn)}</dd></div>
                </dl>
              </div>
              {transcript && <p className="voice-transcript">Bạn đã nói: &quot;{transcript}&quot;</p>}
              {error && <p role="alert" className="app-dialog-error">{error}</p>}
              <div className="app-dialog-actions">
                <button type="button" className="btn-secondary" disabled={loading} onClick={discardReview}>Nói lại</button>
                <button type="button" className="btn-primary" disabled={loading} onClick={saveReview} autoFocus>{loading ? 'Đang lưu...' : saveLabel}</button>
              </div>
            </section>
          )}

          {/* MÀN HÌNH HỎI XÁC NHẬN TẠO DANH MỤC */}
          {pendingPayload && missingCategoryName && (
            <section aria-label="Tạo danh mục mới" className="voice-review">
              <div className="voice-center"><AlertCircle size={44} className="voice-warning-icon" aria-hidden="true" /></div>
              <p className="voice-question">Danh mục &quot;{missingCategoryName}&quot; chưa tồn tại</p>
              <p className="app-dialog-text voice-center">
                Tạo danh mục mới và lưu khoản {pendingPayload.kind === 'income' ? 'thu' : 'chi'} {Number(pendingPayload.amount).toLocaleString('vi-VN')}đ?
              </p>
              {error && <p role="alert" className="app-dialog-error">{error}</p>}
              <div className="app-dialog-actions">
                <button type="button" className="btn-secondary" onClick={() => setPendingPayload(null)} disabled={loading}>Hủy</button>
                <button type="button" className="btn-primary" onClick={handleCreateCategory} disabled={loading}>
                  {loading ? 'Đang lưu...' : <><PlusCircle size={18} aria-hidden="true" /> Tạo & Lưu</>}
                </button>
              </div>
            </section>
          )}
        </dialog>
      )}
    </>
  );
}
