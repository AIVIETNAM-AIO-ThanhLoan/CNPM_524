'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Bell, ChevronLeft, ChevronRight, Coins, Plus, QrCode, Users } from 'lucide-react';
import BottomNav from './components/BottomNav';
import { colorAt } from './lib/colors';
import './styles/home.css';

const suggestions = [
  { Icon: ArrowRightLeft, label: 'Quy đổi tiền tệ' },
  { Icon: Coins, label: 'Giá vàng' },
  { Icon: Users, label: 'Chia tiền nhóm' },
];

// Màu đánh dấu từng chỉ số, lấy từ bảng màu danh mục
const INCOME_DOT = colorAt(3).bg; // xanh lá
const EXPENSE_DOT = colorAt(0).bg; // đỏ cam
const REMAINING_DOT = colorAt(2).bg; // vàng

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

// TODO: thay bằng dữ liệu từ database. Khóa theo tháng là YYYY-MM, theo ngày là YYYY-MM-DD.
// budget là phần trăm ngân sách đã dùng trong tháng.
const monthRecords: Record<string, { income: number; expense: number; budget: number }> = {
  '2026-09': { income: 11000000, expense: 8200000, budget: 84 },
  '2026-10': { income: 12000000, expense: 7450000, budget: 62 },
};

const dayRecords: Record<string, { income: number; expense: number }> = {
  '2026-10-13': { income: 0, expense: 350000 },
};

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const dayKey = (d: Date) => `${monthKey(d)}-${pad(d.getDate())}`;
const monthLabel = (d: Date) => `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
const dayLabel = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

export default function Home() {
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  // TODO: lấy ngày hôm nay từ hệ thống khi có database. Hiện cố định để tránh lệch giữa server và trình duyệt.
  const [month, setMonth] = useState(() => new Date(2026, 9, 1));
  const [day, setDay] = useState(() => new Date(2026, 9, 13));

  const shiftMonth = (delta: number) =>
    setMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const shiftDay = (delta: number) =>
    setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));

  const isMonth = viewMode === 'month';
  const totals: { income: number; expense: number; budget: number } = isMonth
    ? monthRecords[monthKey(month)] ?? { income: 0, expense: 0, budget: 0 }
    : { ...(dayRecords[dayKey(day)] ?? { income: 0, expense: 0 }), budget: 0 };
  const remaining = totals.income - totals.expense;

  return (
    <div className="app-page">
      <header className="home-header">
        <div className="header-top">
          <button type="button" className="icon-btn" aria-label="Thông báo">
            <Bell size={22} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {/* Thẻ tổng quan thu chi */}
      <section className="card summary-card">
        <div className="segmented">
          <button
            type="button"
            className={`segmented-btn ${isMonth ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Tháng
          </button>
          <button
            type="button"
            className={`segmented-btn ${!isMonth ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Ngày
          </button>
        </div>

        <div className="period-nav">
          <button
            type="button"
            className="period-nav-btn"
            aria-label={isMonth ? 'Tháng trước' : 'Ngày trước'}
            onClick={() => (isMonth ? shiftMonth(-1) : shiftDay(-1))}
          >
            <ChevronLeft size={20} />
          </button>
          <span className="period-nav-label">{isMonth ? monthLabel(month) : dayLabel(day)}</span>
          <button
            type="button"
            className="period-nav-btn"
            aria-label={isMonth ? 'Tháng sau' : 'Ngày sau'}
            onClick={() => (isMonth ? shiftMonth(1) : shiftDay(1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">
              <span className="stat-dot" style={{ backgroundColor: INCOME_DOT }} />
              Thu
            </span>
            <p className="stat-value">{formatMoney(totals.income)}</p>
          </div>
          <div className="stat-item">
            <span className="stat-label">
              <span className="stat-dot" style={{ backgroundColor: EXPENSE_DOT }} />
              Chi
            </span>
            <p className="stat-value">{formatMoney(totals.expense)}</p>
          </div>
          <div className="stat-item">
            <span className="stat-label">
              <span className="stat-dot" style={{ backgroundColor: REMAINING_DOT }} />
              Còn lại
            </span>
            <p className="stat-value">{formatMoney(remaining)}</p>
          </div>
        </div>

        {isMonth ? (
          <div className="budget-section">
            <div className="budget-info">
              <span>Ngân sách</span>
              <span className="budget-percent">{totals.budget}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${totals.budget}%` }} />
            </div>
          </div>
        ) : (
          <p className="day-empty">
            {totals.income === 0 && totals.expense === 0
              ? 'Chưa có giao dịch trong ngày này.'
              : 'Xem chi tiết giao dịch trong tab Lịch sử.'}
          </p>
        )}
      </section>

      <div className="action-buttons">
        <button type="button" className="btn-primary">
          <Plus size={18} strokeWidth={2} />
          Ghi giao dịch
        </button>
        <button type="button" className="btn-secondary">
          <QrCode size={18} strokeWidth={1.8} />
          QR của tôi
        </button>
      </div>

      <section className="suggestions-section">
        <h3 className="section-title">Đề xuất</h3>
        <div className="suggestion-grid">
          {suggestions.map(({ Icon, label }, i) => {
            const color = colorAt(i + 4);
            return (
              <button key={label} type="button" className="suggestion-card">
                <span
                  className="suggestion-icon"
                  style={{ backgroundColor: color.bg, color: color.fg }}
                >
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="suggestion-text">{label}</span>
              </button>
            );
          })}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
