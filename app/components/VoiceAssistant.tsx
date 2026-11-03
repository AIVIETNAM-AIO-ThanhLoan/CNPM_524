'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { requestJson, type Wallet, type Category, today } from '@/app/lib/client-api';

export default function VoiceAssistant() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const recognitionRef = useRef<any>(null);

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
          const text = event.results[0][0].transcript.toLowerCase();
          setTranscript(text);
          processVoiceText(text);
          setIsListening(false);
        };

        recognition.onerror = (event: any) => {
          setError('Lỗi micro: ' + event.error);
          setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);
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
    } else {
      setTranscript('');
      setError('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const processVoiceText = async (text: string) => {
    // 1. Thiết lập giá trị mặc định (Fallback)
    let matchedWallet = wallets[0]?.id || '';
    let matchedCategory = categories.find(c => c.kind === 'expense' && c.name.includes('khác'))?.id || categories.find(c => c.kind === 'expense')?.id || '';
    let matchedKind = 'expense';

    // 2. Tự động nhận diện Ví (nếu có đọc tên)
    const foundWallet = wallets.find(w => text.includes(w.name.toLowerCase()));
    if (foundWallet) matchedWallet = foundWallet.id;

    // 3. Tự động nhận diện Danh mục & Loại giao dịch (nếu có đọc tên)
    const foundCategory = categories.find(c => text.includes(c.name.toLowerCase()));
    if (foundCategory) {
      matchedCategory = foundCategory.id;
      matchedKind = foundCategory.kind;
    }

    if (text.includes('thu nhập') || text.includes('nhận được')) matchedKind = 'income';

    // 4. Bóc tách số tiền
    let cleanText = text.toLowerCase();
    cleanText = cleanText.replace(/(\d)[.,\s](\d{3})/g, '$1$2');
    cleanText = cleanText.replace(/(\d)[.,\s](\d{3})/g, '$1$2'); 
    cleanText = cleanText.replace(/(\d+)\s*(nghìn|ngàn|k)\b/g, (_, num) => `${num}000`);
    cleanText = cleanText.replace(/(\d+)\s*(triệu)\b/g, (_, num) => `${num}000000`);
    cleanText = cleanText.replace(/(\d+)\s*(trăm)\b/g, (_, num) => `${num}00`);

    const matches = cleanText.match(/\d+/g);
    let amount = 0;
    if (matches) {
      matches.forEach(m => {
        const val = parseInt(m, 10);
        if (val > amount) amount = val;
      });
    }

    if (!amount || amount <= 0 || isNaN(amount)) {
      setError('Không nhận diện được số tiền. Hãy nói rõ hơn (VD: "ăn uống 50 nghìn").');
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
      
      setIsOpen(false);
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
                {loading ? 'Đang lưu giao dịch...' : isListening ? 'Đang nghe...' : 'Bấm Micro để nói'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}