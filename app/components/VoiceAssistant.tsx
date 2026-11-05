'use client';
import { useState, useEffect, useRef } from 'react';
import { Mic, X, PlusCircle, AlertCircle } from 'lucide-react';
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

  // State cho việc xác nhận tạo danh mục mới
  const [pendingPayload, setPendingPayload] = useState<any>(null);
  const [missingCategoryName, setMissingCategoryName] = useState('');

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
      setPendingPayload(null);
      setMissingCategoryName('');
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const extractCategoryName = (text: string) => {
    let cleanText = text.toLowerCase();
    cleanText = cleanText.replace(/(\d+)\s*(nghìn|ngàn|k|triệu|trăm)?/g, '');
    wallets.forEach(w => {
      cleanText = cleanText.replace(new RegExp(w.name.toLowerCase(), 'g'), '');
    });
    cleanText = cleanText.replace(/(cho|vào|ví|tài khoản|mua|chi|thu|nhận|lương|tiền)\s+/g, '');
    cleanText = cleanText.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    
    const name = cleanText.trim().replace(/\s+/g, ' ');
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const processVoiceText = async (text: string) => {
    let matchedWallet = wallets[0]?.id || '';
    let matchedKind = 'expense';

    // 1. Tìm Ví và Loại giao dịch
    const foundWallet = wallets.find(w => text.includes(w.name.toLowerCase()));
    if (foundWallet) matchedWallet = foundWallet.id;
    if (text.includes('thu nhập') || text.includes('nhận') || text.includes('lương')) matchedKind = 'income';

    // 2. Bóc tách số tiền
    let cleanTextForAmount = text.toLowerCase();
    cleanTextForAmount = cleanTextForAmount.replace(/(\d)[.,\s](\d{3})/g, '$1$2');
    cleanTextForAmount = cleanTextForAmount.replace(/(\d)[.,\s](\d{3})/g, '$1$2'); 
    cleanTextForAmount = cleanTextForAmount.replace(/(\d+)\s*(nghìn|ngàn|k)\b/g, (_, num) => `${num}000`);
    cleanTextForAmount = cleanTextForAmount.replace(/(\d+)\s*(triệu)\b/g, (_, num) => `${num}000000`);
    cleanTextForAmount = cleanTextForAmount.replace(/(\d+)\s*(trăm)\b/g, (_, num) => `${num}00`);

    const matches = cleanTextForAmount.match(/\d+/g);
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

    // 3. Xử lý Danh mục
    let matchedCategory = '';
    const foundCategory = categories.find(c => text.includes(c.name.toLowerCase()));
    
    if (foundCategory) {
      // Nếu đã có danh mục -> Lưu luôn
      matchedCategory = foundCategory.id;
      matchedKind = foundCategory.kind;
      
      executeSave({
        requestKey: crypto.randomUUID(),
        kind: matchedKind,
        walletId: String(matchedWallet),
        targetId: null,
        categoryId: String(matchedCategory),
        amount: String(amount),
        bookedOn: today(),
        note: `Ghi âm: ${text}`
      });
    } else {
      // Không tìm thấy danh mục -> Kiểm tra xem có đọc tên không
      const guessedName = extractCategoryName(text);
      
      if (guessedName.length > 1 && guessedName !== 'Khác') {
        // CÓ ĐỌC TÊN -> Hiện Modal hỏi xác nhận
        setMissingCategoryName(guessedName);
        setPendingPayload({
          requestKey: crypto.randomUUID(),
          kind: matchedKind,
          walletId: String(matchedWallet),
          targetId: null,
          categoryId: '', 
          amount: String(amount),
          bookedOn: today(),
          note: `Ghi âm: ${text}`
        });
      } else {
        // CHỈ ĐỌC SỐ TIỀN -> Tự động vào danh mục "Khác"
        const fallbackCategory = categories.find(c => c.kind === matchedKind && c.name.toLowerCase().includes('khác')) || 
                                 categories.find(c => c.kind === matchedKind);
        
        if (fallbackCategory) {
          executeSave({
            requestKey: crypto.randomUUID(),
            kind: matchedKind,
            walletId: String(matchedWallet),
            targetId: null,
            categoryId: String(fallbackCategory.id),
            amount: String(amount),
            bookedOn: today(),
            note: `Ghi âm: ${text}`
          });
        } else {
          setError('Không tìm thấy danh mục "Khác" để lưu.');
        }
      }
    }
  };

  const executeSave = async (payload: any) => {
    setLoading(true);
    try {
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

  // Xử lý khi người dùng bấm "Tạo & Lưu" trên Modal
  const handleCreateCategory = async () => {
    if (!pendingPayload || !missingCategoryName) return;
    setLoading(true);
    setError('');
    try {
      await requestJson('/api/categories', {
        name: missingCategoryName,
        kind: pendingPayload.kind
      });
      
      const cRes = await requestJson<{ categories: Category[] }>('/api/categories');
      setCategories(cRes.categories);

      const newCategory = cRes.categories.find(
        c => c.name.toLowerCase() === missingCategoryName.toLowerCase() && c.kind === pendingPayload.kind
      );

      if (!newCategory) {
        throw new Error("Đã tạo danh mục nhưng không thể lấy được ID.");
      }
      
      const finalPayload = { ...pendingPayload, categoryId: String(newCategory.id) };
      await executeSave(finalPayload);
      
    } catch (err: any) {
      setError(err.message || 'Không thể tạo danh mục mới.');
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
      
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: '90px', right: '24px', left: 'auto', 
          width: '56px', height: '56px', backgroundColor: '#10b981', color: 'white',
          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, cursor: 'pointer', border: 'none', animation: 'floatVoice 3s ease-in-out infinite'
        }}
        title="Nhập giao dịch bằng giọng nói"
      >
        <Mic size={26} />
      </button>

      {isOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '400px', position: 'relative' }}>
            <button onClick={() => setIsOpen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
              <X size={24} />
            </button>
            
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', textAlign: 'center', marginBottom: '12px' }}>Trợ lý giọng nói</h2>
            
            {/* MÀN HÌNH GHI ÂM CHÍNH */}
            {!pendingPayload && (
              <>
                <div style={{ backgroundColor: '#f3f4f6', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                  <p style={{ fontSize: '14px', color: '#4b5563', textAlign: 'center', lineHeight: '1.5' }}>
                    Bạn có thể nói:<br/>
                    <strong style={{ color: '#10b981' }}>"Ăn uống 50 nghìn"</strong><br/>
                    <strong style={{ color: '#10b981' }}>"Mua sách 200k"</strong> (Hỏi tạo danh mục)<br/>
                    <strong style={{ color: '#10b981' }}>"50 nghìn"</strong> (Tự vào danh mục Khác)<br/>
                  </p>
                </div>

                {error && <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginBottom: '16px' }}>{error}</p>}
                {transcript && <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#4b5563', marginBottom: '16px' }}>Bạn đã nói: "{transcript}"</p>}

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <button
                    onClick={toggleListening}
                    disabled={loading || !isDataLoaded}
                    style={{
                      width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      backgroundColor: isListening ? '#ef4444' : '#d1fae5', color: isListening ? 'white' : '#10b981',
                      border: 'none', cursor: loading || !isDataLoaded ? 'not-allowed' : 'pointer', transition: 'all 0.3s',
                      boxShadow: isListening ? '0 0 20px rgba(239, 68, 68, 0.6)' : 'none', opacity: loading || !isDataLoaded ? 0.5 : 1
                    }}
                  >
                    <Mic size={32} />
                  </button>
                  <p style={{ marginTop: '16px', fontSize: '14px', fontWeight: '500' }}>
                    {loading ? 'Đang xử lý...' : isListening ? 'Đang nghe...' : 'Bấm Micro để nói'}
                  </p>
                </div>
              </>
            )}

            {/* MÀN HÌNH HỎI XÁC NHẬN TẠO DANH MỤC */}
            {pendingPayload && missingCategoryName && (
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
                  <AlertCircle size={48} color="#f59e0b" />
                </div>
                <p style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                  Danh mục "{missingCategoryName}" chưa tồn tại!
                </p>
                <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '24px' }}>
                  Bạn có muốn tạo danh mục mới và lưu giao dịch này không?
                </p>
                {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}
                
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setPendingPayload(null)}
                    disabled={loading}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #d1d5db', backgroundColor: 'white', fontWeight: '600', color: '#4b5563', cursor: loading ? 'not-allowed' : 'pointer' }}
                  >
                    Hủy bỏ
                  </button>
                  <button
                    onClick={handleCreateCategory}
                    disabled={loading}
                    style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#10b981', fontWeight: '600', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                  >
                    {loading ? 'Đang lưu...' : <><PlusCircle size={18}/> Tạo & Lưu</>}
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}