'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { requestJson, type Wallet, type Category, today } from '@/app/lib/client-api';
import { notifyFinanceUpdated } from '@/app/lib/finance-updates';
import { parseVoiceAmount } from '@/app/lib/voice-amount.mjs';

// Trình duyệt chỉ hỏi quyền micro một lần; đã chặn hoặc không hỗ trợ thì không hiện hộp hỏi nên phải báo rõ cách xử lý.
const VOICE_ERRORS: Record<string, string> = {
  'not-allowed': 'Micro đang bị chặn nên trình duyệt không hỏi lại. Hãy bấm biểu tượng cạnh thanh địa chỉ, cho phép Micro rồi tải lại trang.',
  'service-not-allowed': 'Trình duyệt không cho dùng dịch vụ nhận giọng nói. Trên Safari, hãy bật Siri và Đọc chính tả trong Cài đặt hệ thống, hoặc dùng Chrome.',
  'audio-capture': 'Không tìm thấy micro. Hãy kiểm tra micro của thiết bị.',
  'no-speech': 'Không nghe thấy tiếng nói. Hãy bấm micro và nói lại.',
  network: 'Không kết nối được dịch vụ nhận giọng nói. Hãy kiểm tra mạng rồi thử lại.',
};

export default function VoiceAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const recognitionRef = useRef<any>(null);
  // Trình duyệt có thể kết thúc mà không trả kết quả cũng không báo lỗi; khi đó phải tự báo cho người dùng.
  const answeredRef = useRef(false);

  useEffect(() => {
    if (isOpen && wallets.length === 0) {
      setIsDataLoaded(false);
      Promise.all([
        requestJson<{ wallets: Wallet[] }>('/api/wallets'),
        requestJson<{ categories: Category[] }>('/api/categories')
      ]).then(([wRes, cRes]) => {
        setWallets(wRes.wallets);
        setCategories(cRes.categories);
        setIsDataLoaded(true);
      }).catch(() => setError('Không thể tải dữ liệu. Vui lòng thử lại.'));
    }
  }, [isOpen, wallets.length]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'vi-VN';

        recognition.onresult = (event: any) => {
          answeredRef.current = true;
          const text = event.results[0][0].transcript.normalize('NFC').toLowerCase();
          setTranscript(text);
          processVoiceText(text);
          setIsListening(false);
        };

        recognition.onstart = () => {
          setIsStarting(false);
          setIsListening(true);
        };

        recognition.onerror = (event: any) => {
          answeredRef.current = true;
          if (event.error !== 'aborted') setError(VOICE_ERRORS[event.error] || 'Lỗi micro: ' + event.error);
          setIsStarting(false);
          setIsListening(false);
        };

        recognition.onend = () => {
          if (!answeredRef.current) setError('Chưa nhận được lời nói. Hãy bấm micro và nói lại.');
          answeredRef.current = true;
          setIsStarting(false);
          setIsListening(false);
        };
        recognitionRef.current = recognition;
      }
    }
  }, [wallets, categories]);

  const toggleListening = () => {
    if (!isDataLoaded) {
      setError('Đang tải dữ liệu, vui lòng đợi 1 giây.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
    } else if (isStarting) {
      answeredRef.current = true;
      recognitionRef.current?.abort();
      setIsStarting(false);
    } else {
      setTranscript('');
      setError('');
      setSaved('');
      answeredRef.current = false;
      if (!window.isSecureContext) {
        setError('Micro chỉ hoạt động trên HTTPS hoặc localhost. Hãy mở ứng dụng bằng địa chỉ HTTPS.');
        return;
      }
      if (!recognitionRef.current) {
        setError('Trình duyệt này không hỗ trợ nhận giọng nói. Hãy mở bằng Chrome.');
        return;
      }
      try {
        recognitionRef.current.start();
        setIsStarting(true);
      } catch {
        setError('Không bật được micro. Hãy đóng hộp thoại và thử lại.');
      }
    }
  };

  const processVoiceText = async (text: string) => {
    // 1. Thiết lập giá trị mặc định (Fallback)
    let matchedWallet = wallets[0]?.id || '';
    let matchedCategory = categories.find(c => c.kind === 'expense' && c.name.includes('khác'))?.id || categories.find(c => c.kind === 'expense')?.id || '';
    let matchedKind = 'expense';

    // 2. Tự động nhận diện Ví (nếu có đọc tên)
    const foundWallet = wallets.find(w => text.includes(w.name.normalize('NFC').toLowerCase()));
    if (foundWallet) matchedWallet = foundWallet.id;

    // 3. Tự động nhận diện Danh mục & Loại giao dịch (nếu có đọc tên)
    const foundCategory = categories.find(c => text.includes(c.name.normalize('NFC').toLowerCase()));
    if (foundCategory) {
      matchedCategory = foundCategory.id;
      matchedKind = foundCategory.kind;
    }

    if (!foundCategory && (text.includes('thu nhập') || text.includes('nhận được'))) {
      matchedKind = 'income';
      matchedCategory = categories.find(c => c.kind === 'income' && c.name.includes('khác'))?.id || categories.find(c => c.kind === 'income')?.id || '';
    }

    // 4. Bóc tách số tiền
    const amount = parseVoiceAmount(text);

    // Số quá nhỏ thường là thiếu đơn vị ("ăn uống 50"), không tự đoán để tránh ghi sai tiền.
    if (amount < 1000) {
      setError('Không nhận diện được số tiền. Hãy nói rõ cả đơn vị (VD: "ăn uống 50 nghìn").');
      return;
    }

    setLoading(true);
    try {
      if (!matchedWallet || !matchedCategory) {
        throw new Error("Lỗi: Dữ liệu ví hoặc danh mục trống.");
      }

      const payload = {
        requestKey: crypto.randomUUID(),
        kind: matchedKind,
        walletId: String(matchedWallet), 
        targetId: null, 
        categoryId: String(matchedCategory),
        amount: String(amount),
        bookedOn: today(), 
        note: `Ghi âm: ${text}`
      };
      
      await requestJson('/api/transactions', payload);

      const categoryName = categories.find(c => c.id === matchedCategory)?.name;
      const walletName = wallets.find(w => w.id === matchedWallet)?.name;
      setSaved(`Đã ghi ${matchedKind === 'income' ? 'khoản thu' : 'khoản chi'} ${amount.toLocaleString('vi-VN')}đ · ${categoryName} · ${walletName}`);
      notifyFinanceUpdated();
      router.refresh();
    } catch (err: any) {
      console.error("Lỗi khi lưu qua Voice:", err);
      setError(err.message || 'Lỗi khi lưu giao dịch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatVoice {
          0% { transform: translateY(0px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
          50% { transform: translateY(-8px); box-shadow: 0 12px 20px rgba(16, 185, 129, 0.6); }
          100% { transform: translateY(0px); box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); }
        }
      `}</style>
      
      {/* Nút Voice nổi */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '90px', 
          right: '24px',
          left: 'auto', 
          width: '56px',
          height: '56px',
          backgroundColor: '#10b981',
          color: 'white',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          cursor: 'pointer',
          border: 'none',
          animation: 'floatVoice 3s ease-in-out infinite'
        }}
        title="Nhập giao dịch bằng giọng nói"
      >
        <Mic size={26} />
      </button>

      {/* Modal Ghi âm */}
      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px' }}>Trợ lý giọng nói</h2>
            
            <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#4b5563', textAlign: 'center', lineHeight: '1.5' }}>
                Bạn có thể nói:<br/>
                <strong style={{ color: '#10b981' }}>"Ăn uống 50 nghìn"</strong><br/>
                <strong style={{ color: '#10b981' }}>"Nhận lương 10 triệu"</strong><br/>
                <span style={{ fontSize: '12px', color: '#6b7280' }}>(Nếu không đọc tên, hệ thống sẽ tự chọn Ví và Danh mục phù hợp)</span>
              </p>
            </div>

            {!isDataLoaded && !error && <p style={{ textAlign: 'center', color: 'gray', marginBottom: '16px' }}>Đang tải dữ liệu...</p>}
            {error && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}
            {saved && <p role="status" style={{ color: '#047857', fontWeight: 600, fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{saved}</p>}
            {transcript && <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#4b5563', marginBottom: '16px' }}>Bạn đã nói: "{transcript}"</p>}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                onClick={toggleListening}
                disabled={loading || !isDataLoaded}
                style={{
                  width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  backgroundColor: isListening ? '#ef4444' : '#d1fae5',
                  color: isListening ? 'white' : '#10b981',
                  border: 'none', cursor: loading || !isDataLoaded ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                  boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none',
                  opacity: loading || !isDataLoaded ? 0.5 : 1
                }}
              >
                <Mic size={32} />
              </button>
              <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500' }}>
                {loading ? 'Đang lưu giao dịch...' : isListening ? 'Đang nghe...' : isStarting ? 'Đang bật micro... Nếu trình duyệt hỏi quyền, hãy chọn Cho phép.' : 'Bấm Micro để nói'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}