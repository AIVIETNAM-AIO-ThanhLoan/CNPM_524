'use client';

import '../styles/market.css';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import BottomNav from '../components/BottomNav'; // Đã thêm BottomNav

type GoldPrice = {
  id: number;
  brand: string;
  type: string;
  buy: number;
  sell: number;
};

export default function GoldClient() {
  const [prices, setPrices] = useState<GoldPrice[]>([]);
  const [updatedAt, setUpdatedAt] = useState('');
  const [loading, setLoading] = useState(true);
  // Tăng số này để tải lại giá vàng (nút làm mới)
  const [reload, setReload] = useState(0);

  // Chỉ cập nhật state trong callback của fetch, không gọi setState ngay trong effect
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/market?type=gold', { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setPrices(data.prices);
          setUpdatedAt(data.updatedAt);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);

  const fetchGoldPrices = () => {
    setLoading(true);
    setReload((n) => n + 1);
  };

  const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

  return (
    // Thay đổi wrapper thành app-page để đồng bộ, thêm pb-24 để không bị BottomNav che
    <div className="app-page gold-page pb-24">
      
      {/* Header chuẩn web app */}
      <header className="page-header flex items-center justify-between p-4 mb-2">
        <div className="flex items-center gap-3">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Coins className="text-yellow-500" /> Giá Vàng
          </h1>
        </div>
        <button 
          onClick={fetchGoldPrices} 
          disabled={loading}
          className="p-2 bg-white text-yellow-600 rounded-full shadow-sm hover:bg-yellow-50 transition"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </header>

      <div className="px-4">
        {/* Trạng thái cập nhật */}
        <div className="flex justify-between items-center mb-4 px-1">
          <p className="text-sm text-gray-500 font-medium">Đơn vị: VNĐ</p>
          {updatedAt && <p className="text-xs text-gray-400">Cập nhật: {updatedAt}</p>}
        </div>

        {/* Danh sách giá vàng */}
        <div className="space-y-4">
          {loading && prices.length === 0 ? (
            <div className="text-center text-gray-500 py-10">Đang tải dữ liệu...</div>
          ) : (
            prices.map((gold) => (
              <div key={gold.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition">
                {/* Tên thương hiệu */}
                <div className="bg-gradient-to-r from-yellow-50 to-white p-4 border-b border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center shrink-0">
                    <Coins size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg">{gold.brand}</h3>
                    <p className="text-xs text-gray-500 font-medium">{gold.type}</p>
                  </div>
                </div>

                {/* Giá mua - bán */}
                <div className="grid grid-cols-2 divide-x divide-gray-100 p-2">
                  <div className="p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                      <TrendingDown size={14} className="text-green-500" /> Mua vào
                    </p>
                    <p className="text-lg font-bold text-green-600">{formatMoney(gold.buy)}</p>
                  </div>
                  
                  <div className="p-3 text-center">
                    <p className="text-xs text-gray-500 mb-1 flex items-center justify-center gap-1">
                      <TrendingUp size={14} className="text-red-500" /> Bán ra
                    </p>
                    <p className="text-lg font-bold text-red-600">{formatMoney(gold.sell)}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-100 mb-6">
          <p className="text-xs text-yellow-700 text-center">
            * Giá vàng trên chỉ mang tính chất tham khảo.
          </p>
        </div>
      </div>

      {/* Thêm BottomNav */}
      <BottomNav />
    </div>
  );
}