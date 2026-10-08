'use client';

import React, { useState } from 'react';
import {
  Banknote,
  Car,
  ChevronLeft,
  ChevronRight,
  Gift,
  GraduationCap,
  House,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import '../styles/reports.css';

type Category = { name: string; amount: number; Icon: typeof Gift };

type Period = {
  label: string;
  range: string;
  expense: Category[];
  income: Category[];
};

// TODO: thay bằng dữ liệu từ database theo kỳ đang chọn.
const monthPeriod: Period = {
  label: '10/2026',
  range: '01/10 – 31/10',
  expense: [
    { name: 'Ăn uống', amount: 3200000, Icon: UtensilsCrossed },
    { name: 'Tiền nhà', amount: 1750000, Icon: House },
    { name: 'Đi lại', amount: 1500000, Icon: Car },
    { name: 'Học tập', amount: 1000000, Icon: GraduationCap },
  ],
  income: [
    { name: 'Lương', amount: 10000000, Icon: Banknote },
    { name: 'Thưởng', amount: 2000000, Icon: Gift },
  ],
};

const weekPeriod: Period = {
  label: 'Tuần 2',
  range: '05/10 – 11/10',
  expense: [
    { name: 'Ăn uống', amount: 900000, Icon: UtensilsCrossed },
    { name: 'Đi lại', amount: 600000, Icon: Car },
    { name: 'Mua sắm', amount: 550000, Icon: ShoppingBag },
    { name: 'Học tập', amount: 300000, Icon: GraduationCap },
  ],
  income: [
    { name: 'Thưởng', amount: 1500000, Icon: Gift },
    { name: 'Bán đồ cũ', amount: 500000, Icon: Banknote },
  ],
};

// Màu các phần biểu đồ và icon, chỉ lấy từ bảng màu burgundy; lặp lại khi hết màu
const CHART_COLORS = [
  'var(--color-wine)',
  'var(--color-burgundy)',
  'var(--color-rose)',
  'var(--color-rose-soft)',
  'var(--color-blush)',
];

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const sumOf = (items: Category[]) => items.reduce((sum, item) => sum + item.amount, 0);

export default function Reports() {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [tab, setTab] = useState<'expense' | 'income'>('expense');

  const period = viewMode === 'month' ? monthPeriod : weekPeriod;
  const totalExpense = sumOf(period.expense);
  const totalIncome = sumOf(period.income);
  const difference = totalIncome - totalExpense;

  const isExpense = tab === 'expense';
  const items = isExpense ? period.expense : period.income;
  const total = isExpense ? totalExpense : totalIncome;

  // Vùng màu conic-gradient tính từ tỷ lệ của từng danh mục
  let start = 0;
  const gradient =
    total === 0
      ? 'var(--color-line)'
      : `conic-gradient(${items
          .map((item, i) => {
            const from = start;
            start += (item.amount / total) * 100;
            return `${CHART_COLORS[i % CHART_COLORS.length]} ${from}% ${start}%`;
          })
          .join(', ')})`;

  return (
    <div className="app-page">
      <header className="page-header reports-header">
        <div className="segmented">
          <button
            type="button"
            className={`segmented-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Tuần
          </button>
          <button
            type="button"
            className={`segmented-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Tháng
          </button>
        </div>
      </header>

      <div className="period-box">
        <button type="button" className="period-btn" aria-label="Kỳ trước">
          <ChevronLeft size={20} />
        </button>
        <div className="period-center">
          <span className="period-text">{period.label}</span>
          <span className="period-range">({period.range})</span>
        </div>
        <button type="button" className="period-btn" aria-label="Kỳ sau">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="stat-pair">
        <div className="stat-card">
          <span className="stat-label">Chi tiêu</span>
          <span className="stat-amount text-expense">-{formatMoney(totalExpense)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Thu</span>
          <span className="stat-amount text-income">+{formatMoney(totalIncome)}</span>
        </div>
      </div>

      <div className="stat-full">
        <span className="stat-label">Thu chi</span>
        <span className="stat-amount">
          {difference >= 0 ? '+' : '-'}
          {formatMoney(Math.abs(difference))}
        </span>
      </div>

      <div className="type-tabs">
        <button
          type="button"
          className={`type-tab ${isExpense ? 'active' : ''}`}
          onClick={() => setTab('expense')}
        >
          Chi tiêu
        </button>
        <button
          type="button"
          className={`type-tab ${!isExpense ? 'active' : ''}`}
          onClick={() => setTab('income')}
        >
          Thu nhập
        </button>
      </div>

      <div className="donut-wrap">
        <div className="donut" style={{ background: gradient }}>
          <div className="donut-hole">
            <span className="donut-label">{isExpense ? 'Tổng chi' : 'Tổng thu'}</span>
            <span className="donut-total">{formatMoney(total)}</span>
          </div>
        </div>
      </div>

      <section className="category-list">
        {items.map(({ name, amount, Icon }, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          const percent = total === 0 ? 0 : (amount / total) * 100;
          return (
            <div key={name} className="category-row">
              <div className="category-info">
                <span className="category-icon" style={{ color }}>
                  <Icon size={22} strokeWidth={1.8} />
                </span>
                <span className="category-name">{name}</span>
              </div>
              <div className="category-amount-group">
                <span className={`category-amount ${isExpense ? 'text-expense' : 'text-income'}`}>
                  {formatMoney(amount)}
                </span>
                <span className="category-percent">{percent.toFixed(1)} %</span>
              </div>
              <ChevronRight size={18} className="category-chevron" />
            </div>
          );
        })}
      </section>

      <BottomNav />
    </div>
  );
}
