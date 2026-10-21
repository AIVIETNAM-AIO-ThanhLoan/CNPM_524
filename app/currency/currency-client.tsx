'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, RefreshCw, Save, Clock, CheckCircle2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';

const CURRENCIES = ['VND', 'USD', 'EUR', 'JPY', 'GBP', 'AUD', 'KRW'];

export default function CurrencyClient() {
  const [amount, setAmount] = useState<number | ''>(1);
  const [from, setFrom] = useState('USD');
  const [to, setTo] = useState('VND');
  const [rate, setRate] = useState<number | null>(null);
  
  const [customRate, setCustomRate] = useState<number | null>(null);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchRate = async () => {
    setLoading(true);
    setCustomRate(null);
    setIsEditingRate(false);
    try {
      // Gọi API currency mới
      const res = await fetch(`/api/currency?action=rate&from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) setRate(data.rate);
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/currency?action=history');
      const data = await res.json();
      if (data.success) setHistory(data.history);
    } catch (error) {}
  };

  useEffect(() => {
    fetchRate();
  }, [from, to]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  const activeRate = customRate !== null ? customRate : rate;
  const convertedAmount = activeRate && amount ? (Number(amount) * activeRate) : 0;

  const handleSaveHistory = async () => {
    if (!convertedAmount || !activeRate) return;
    try {
      // Gọi API POST để lưu
      await fetch('/api/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from, to, amount, result: convertedAmount, rate: activeRate
        })
      });
      setSaved(true);
      fetchHistory();
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      alert('Lỗi khi lưu!');
    }
  };

  return (
    <div className="app-page pb-24">
      <header className="page-header flex items-center gap-3 p-4 mb-2">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-xl font-bold text-gray-800">Chuyển đổi tiền tệ</h1>
      </header>

      <div className="px-4">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
          <div className="mb-4">
            <label className="text-sm text-gray-500 font-medium mb-1 block">Số tiền</label>
            <input 
              type="number" 
              value={amount} 
              onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full text-2xl font-bold text-gray-800 border-b-2 border-gray-200 pb-2 focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="0"
            />
          </div>

          <div className="flex items-center justify-between gap-2 mt-6 bg-gray-50 p-2 rounded-xl">
            <select value={from} onChange={e => setFrom(e.target.value)} className="w-full bg-transparent font-semibold text-gray-700 p-2 outline-none cursor-pointer text-center">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={handleSwap} className="p-2 bg-white rounded-full shadow-sm text-blue-500 hover:bg-blue-50 transition shrink-0">
              <ArrowRightLeft size={20} />
            </button>

            <select value={to} onChange={e => setTo(e.target.value)} className="w-full bg-transparent font-semibold text-gray-700 p-2 outline-none cursor-pointer text-center">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="mt-8 p-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-blue-100 text-sm mb-1">Kết quả quy đổi</p>
              <div className="text-3xl font-bold flex items-center justify-between mb-4">
                <span>{convertedAmount.toLocaleString('vi-VN', { maximumFractionDigits: 2 })} {to}</span>
                <button onClick={fetchRate} disabled={loading} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition">
                  <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
              
              <button 
                onClick={handleSaveHistory}
                className="w-full py-2 bg-white text-blue-600 font-bold rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition"
              >
                {saved ? <CheckCircle2 size={18} /> : <Save size={18} />} 
                {saved ? 'Đã lưu!' : 'Lưu lịch sử'}
              </button>
            </div>
            <div className="absolute -bottom-6 -right-6 text-blue-400 opacity-30">
              <ArrowRightLeft size={120} />
            </div>
          </div>

          <div className="mt-6 text-center bg-gray-50 p-3 rounded-lg border border-gray-100">
            {isEditingRate ? (
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm text-gray-600">1 {from} =</span>
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
                  className="w-32 p-1 text-center font-bold text-blue-600 border-b-2 border-blue-500 outline-none bg-transparent"
                />
                <span className="text-sm text-gray-600">{to}</span>
              </div>
            ) : (
              <p 
                className="text-sm text-gray-600 cursor-pointer hover:text-blue-500 transition"
                onClick={() => setIsEditingRate(true)}
              >
                1 {from} = <span className="font-bold text-blue-600 border-b border-dashed border-blue-400">
                  {activeRate ? activeRate.toLocaleString('vi-VN', { maximumFractionDigits: 4 }) : '...'}
                </span> {to} <span className="text-xs text-gray-400 ml-1">(Sửa)</span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
            <Clock size={16} /> Lịch sử gần đây
          </h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
            {history.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">Chưa có lịch sử quy đổi.</p>
            ) : (
              history.map((item) => (
                <div key={item.id} className="p-3 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-semibold text-gray-800">
                      {Number(item.amount).toLocaleString('vi-VN')} {item.from_currency}
                    </p>
                    <p className="text-xs text-gray-500">
                      Tỷ giá: {Number(item.rate_used).toLocaleString('vi-VN')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">
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