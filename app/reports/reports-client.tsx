'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { dateKey } from '../lib/client-api';
import { useFinance } from '../lib/use-finance';
import {
  ChevronLeft,
  ChevronRight,
  Gift,
} from 'lucide-react';
import BottomNav from '../components/BottomNav';
import { colorAt } from '../lib/colors';
import '../styles/reports.css';

type Category = { name: string; amount: number; Icon: typeof Gift };

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const sumOf = (items: Category[]) => items.reduce((sum, item) => sum + item.amount, 0);

export default function Reports({ initialDate }: { initialDate: string }) {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [anchor, setAnchor] = useState(() => new Date(`${initialDate}T12:00:00`));
  const from = new Date(anchor);
  const to = new Date(anchor);
  if (viewMode === 'month') {
    from.setDate(1);
    to.setMonth(to.getMonth() + 1, 0);
  } else {
    from.setDate(from.getDate() - (from.getDay() + 6) % 7);
    to.setTime(from.getTime());
    to.setDate(to.getDate() + 6);
  }
  const startDate = dateKey(from);
  const endDate = dateKey(to);
  const { data, error, loading } = useFinance(startDate, endDate);
  const shift = (delta: number) => setAnchor((old) => viewMode === 'month'
    ? new Date(old.getFullYear(), old.getMonth() + delta, 1, 12)
    : new Date(old.getFullYear(), old.getMonth(), old.getDate() + delta * 7, 12));
  const period = {
    label: viewMode === 'month' ? `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}` : 'Theo tuần',
    range: `${startDate} – ${endDate}`,
    income: data.breakdown.filter((c) => c.kind === 'income').map((c): Category => ({ name: c.name, amount: Number(c.amount), Icon: Gift })),
    expense: data.breakdown.filter((c) => c.kind === 'expense').map((c): Category => ({ name: c.name, amount: Number(c.amount), Icon: Gift })),
  };

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
            return `${colorAt(i).bg} ${from}% ${start}%`;
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
        <button type="button" className="period-btn" aria-label="Kỳ trước" onClick={() => shift(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="period-center">
          <span className="period-text">{period.label}</span>
          <span className="period-range">({period.range})</span>
        </div>
        <button type="button" className="period-btn" aria-label="Kỳ sau" onClick={() => shift(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && <p className="data-status" role="status">Đang tải dữ liệu…</p>}
      {error && <p className="data-status" role="alert">{error} <Link href="/login">Đăng nhập</Link></p>}
      {!loading && !error && !data.breakdown.length && <p className="data-status">Chưa có thu/chi trong kỳ này.</p>}
      <div className="stat-pair">
        <div className="stat-card stat-expense">
          <span className="stat-label">Chi tiêu</span>
          <span className="stat-amount">-{formatMoney(totalExpense)}</span>
        </div>
        <div className="stat-card stat-income">
          <span className="stat-label">Thu</span>
          <span className="stat-amount">+{formatMoney(totalIncome)}</span>
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
          const color = colorAt(i);
          const percent = total === 0 ? 0 : (amount / total) * 100;
          return (
            <div key={name} className="category-row">
              <div className="category-info">
                <span
                  className="category-icon"
                  style={{ backgroundColor: color.bg, color: color.fg }}
                >
                  <Icon size={18} strokeWidth={1.8} />
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
