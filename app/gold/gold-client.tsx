'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import BottomNav from '../components/BottomNav';

type GoldPrice = {
  id: number;
  brand: string;
  type: string;
  buy: number;
  sell: number;
};

// Dòng này BẮT BUỘC phải có chữ export default
export default function GoldClient() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    let controller: AbortController;
    function refresh() {
      controller?.abort();
      const request = new AbortController();
      controller = request;
      void fetch('/api/market?type=gold', { signal: request.signal })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || 'Không lấy được giá vàng.');
          return data;
        })
        .then((data) => {
          if (!request.signal.aborted) { setPrices(data.prices); setUpdatedAt(data.updatedAt); setError(''); }
        })
        .catch((error: unknown) => {
          if (!request.signal.aborted) setError(error instanceof Error ? error.message : 'Không lấy được giá vàng.');
        })
        .finally(() => { if (!request.signal.aborted) setLoading(false); });
    }
    refresh();
    const interval = setInterval(refresh, 10000);
    return () => { clearInterval(interval); controller?.abort(); };
  }, [reload]);

  const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="app-page pb-24">
      <header className="page-header flex items-center justify-between p-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-surface rounded-full shadow-sm hover:bg-haze transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Coins className="text-highlight" /> Giá Vàng Thị Trường
          </h1>
        </div>
        <button 
          onClick={() => { setLoading(true); setReload(n => n + 1); }}
          aria-label="Làm mới giá vàng"
          disabled={loading}
          className="p-2 bg-surface text-highlight rounded-full shadow-sm hover:bg-highlight-soft transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-4">
        {error && <p role="alert" className="ledger-error">{error}</p>}
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-sm text-muted font-medium">Đơn vị: VNĐ / Lượng</p>
          {updatedAt && (
            <p className="text-xs text-income font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-income rounded-full animate-pulse"></span>
              Cập nhật: {updatedAt}
            </p>
          )}
        </div>

        <div className="space-y-4">
          {loading && prices.length === 0 ? (
             <div className="text-center text-muted py-10 animate-pulse">Đang kết nối dữ liệu thị trường...</div>
          ) : prices.length === 0 ? (
             <div className="text-center text-muted py-10">Không có dữ liệu.</div>
          ) : (
            prices.map((gold) => (
              <div key={gold.id} className="bg-surface rounded-2xl shadow-sm border border-line overflow-hidden hover:shadow-md transition">
                <div className="bg-highlight-soft/40 p-4 border-b border-line flex items-center gap-3">
                  <div className="w-10 h-10 bg-highlight-soft text-highlight rounded-full flex items-center justify-center shrink-0">
                    <Coins size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-ink text-lg uppercase">{gold.brand}</h3>
                    <p className="text-xs text-muted font-medium">{gold.type}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x divide-line p-2">
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                      <TrendingDown size={14} className="text-income" /> Mua vào
                    </p>
                    <p className="text-lg font-bold text-income transition-all duration-500">{formatMoney(gold.buy)}</p>
                  </div>
                  
                  <div className="p-3 text-center">
                    <p className="text-xs text-muted mb-1 flex items-center justify-center gap-1">
                      <TrendingUp size={14} className="text-expense" /> Bán ra
                    </p>
                    <p className="text-lg font-bold text-expense transition-all duration-500">{formatMoney(gold.sell)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-highlight-soft/40 rounded-xl border border-highlight-soft mb-6">
          <p className="text-xs text-warning text-center">
            * Dữ liệu được cập nhật trực tiếp từ thị trường (vang.today).
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
