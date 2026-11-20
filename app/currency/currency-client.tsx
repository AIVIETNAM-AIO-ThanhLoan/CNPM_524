'use client';

import '../styles/market.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, RefreshCw, Save, Clock, CheckCircle2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CURRENCIES = ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'KRW'];

// Một dòng trong bảng exchange_history (MySQL trả số thập phân dạng chuỗi)
type HistoryItem = {
  id: number;
  from_currency: string;
  to_currency: string;
  amount: string | number;
  result: string | number;
  rate_used: string | number;
  created_at: string;
};

export default function CurrencyClient() {
  const [amount, setAmount] = useState<number | ''>(1);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('VND');
  const [rate, setRate] = useState<number | null>(null);

  const [customRate, setCustomRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [rateError, setRateError] = useState('');
  const [historyError, setHistoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  // Tăng các số này để tải lại tỷ giá (nút làm mới) hoặc lịch sử (sau khi lưu)
  const [rateReload, setRateReload] = useState(0);
  const [historyReload, setHistoryReload] = useState(0);

  // Chỉ cập nhật state trong callback của fetch, không gọi setState ngay trong effect
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/currency?action=rate&from=${from}&to=${to}`, { signal: controller.signal })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Không lấy được tỷ giá.'); return data; })
      .then((data) => {
        if (!controller.signal.aborted && data.success) { setRate(data.rate); setRateError(''); }
      })
      .catch((error) => { if (!controller.signal.aborted) { setRate(null); setRateError(error instanceof Error ? error.message : 'Không lấy được tỷ giá.'); } })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [from, to, rateReload]);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/currency?action=history', { signal: controller.signal })
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Không tải được lịch sử.'); return data; })
      .then((data) => {
        if (!controller.signal.aborted && data.success) { setHistory(data.history); setHistoryError(''); }
      })
      .catch((error) => { if (!controller.signal.aborted) { setHistory([]); setHistoryError(error instanceof Error ? error.message : 'Không tải được lịch sử.'); } });
    return () => controller.abort();
  }, [historyReload]);

  // Đổi cặp tiền hoặc làm mới: bỏ tỷ giá tự nhập và hiện trạng thái đang tải
  const resetRate = () => {
    setLoading(true);
    setRate(null);
    setRateError('');
    setCustomRate(null);
    setIsEditingRate(false);
  };

  const fetchRate = () => {
    resetRate();
    setRateReload((n) => n + 1);
  };

  const changeFrom = (value: string) => {
    if (value === from) return;
    resetRate();
    setFrom(value);
  };

  const changeTo = (value: string) => {
    if (value === to) return;
    resetRate();
    setTo(value);
  };

  const handleSwap = () => {
    if (from === to) return;
    resetRate();
    setFrom(to);
    setTo(from);
  };

  const activeRate = customRate !== null ? customRate : rate;
  const convertedAmount = activeRate && amount ? (Number(amount) * activeRate) : 0;

  const handleSaveHistory = async () => {
    if (!Number.isFinite(convertedAmount) || convertedAmount <= 0 || !activeRate || activeRate <= 0) return;
    setSaveError('');
    try {
      // Gọi API POST để lưu
      const res = await fetch('/api/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to, amount, result: convertedAmount, rate: activeRate
        })
      });
      // API trả { error } khi chưa đăng nhập hoặc dữ liệu sai; hiện đúng lý do thay vì báo đã lưu
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Lỗi khi lưu!');
      setSaved(true);
      setHistoryReload((n) => n + 1);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      // Báo lỗi ngay dưới nút, cùng kiểu với các trang khác, thay cho hộp alert của trình duyệt.
      setSaveError(error instanceof Error ? error.message : 'Lỗi khi lưu!');
    }
  };

  return (
    <div className="app-page currency-page pb-24">
      <header className="page-header flex items-center gap-3 p-4 mb-2">
        <Link href="/" className="p-2 bg-surface rounded-full shadow-sm hover:bg-haze transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-ink">Chuyển đổi tiền tệ</h1>
      </header>

      <div className="px-4">
        <div className="bg-surface p-5 rounded-2xl shadow-sm border border-line">
          <div className="mb-4">
            <label className="text-sm text-muted font-medium mb-1 block">Số tiền</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-2xl font-bold text-ink border-b-2 border-line pb-2 focus:outline-none focus:border-primary transition-colors"
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-6 bg-haze p-2 rounded-xl">
            <select value={from} onChange={e => changeFrom(e.target.value)} className="w-full bg-transparent font-semibold text-ink p-2 outline-none cursor-pointer text-center">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={handleSwap} className="p-2 bg-surface rounded-full shadow-sm text-primary hover:bg-haze transition shrink-0">
              <ArrowRightLeft size={20} />
            </button>

            <select value={to} onChange={e => changeTo(e.target.value)} className="w-full bg-transparent font-semibold text-ink p-2 outline-none cursor-pointer text-center">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mt-8 p-5 bg-primary rounded-xl text-on-primary shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-on-primary/80 text-sm mb-1">Kết quả quy đổi</p>
              <div className="text-3xl font-bold flex items-center justify-between mb-4">
                <span>{convertedAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {to}</span>
                <button onClick={fetchRate} disabled={loading} className="p-2 bg-on-primary/20 rounded-full hover:bg-on-primary/30 transition">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              
              <button 
                onClick={handleSaveHistory}
                disabled={loading || !Number.isFinite(convertedAmount) || convertedAmount <= 0 || !activeRate || activeRate <= 0}
                className="w-full py-2 bg-surface text-primary font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-haze transition"
              >
                {saved ? <CheckCircle2 size={18} /> : <Save size={18} />} 
                {saved ? 'Đã lưu!' : 'Lưu lịch sử'}
              </button>
              {saveError && <p role="alert" className="mt-2 rounded-lg bg-surface px-3 py-2 text-sm text-danger">{saveError}</p>}
            </div>
            <div className="absolute -bottom-6 -right-6 text-on-primary opacity-20">
              <ArrowRightLeft size={120} />
            </div>
          </div>

          <div className="mt-6 text-center bg-haze p-3 rounded-lg border border-line">
            {isEditingRate ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-muted">1 {from} =</span>
                <input 
                  type="number" 
                  autoFocus
                  defaultValue={customRate || rate || 0}
                  onBlur={(e) => {
                    setCustomRate(Number(e.target.value));
                    setIsEditingRate(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setCustomRate(Number(e.currentTarget.value));
                      setIsEditingRate(false);
                    }
                  }}
                  className="w-32 p-1 text-center font-bold text-primary border-b-2 border-primary outline-none bg-transparent"
                />
                <span className="text-sm text-muted">{to}</span>
              </div>
            ) : (
              <p 
                className="text-sm text-muted cursor-pointer hover:text-primary transition"
                onClick={() => setIsEditingRate(true)}
              >
                1 {from} = <span className="font-bold text-primary border-b border-dashed border-primary">
                  {activeRate ? activeRate.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : '...'}
                </span> {to} <span className="text-xs text-muted ml-1">(Sửa)</span>
              </p>
            )}
          </div>
          {rateError && <p role="alert">{rateError} Vui lòng thử lại hoặc nhập tỷ giá thủ công.</p>}
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <Clock size={16} /> Lịch sử gần đây
          </h2>
          <div className="bg-surface rounded-xl shadow-sm border border-line overflow-hidden divide-y divide-line">
            {historyError ? <p role="alert" className="p-4">{historyError}</p> : history.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted">Chưa có lịch sử quy đổi.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-ink">
                      {Number(item.amount).toLocaleString('vi-VN')} {item.from_currency}
                    </p>
                    <p className="text-xs text-muted">
                      Tỷ giá: {Number(item.rate_used).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">
                      {Number(item.result).toLocaleString('vi-VN')} {item.to_currency}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
