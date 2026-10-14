'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dateKey } from './lib/client-api';
import { useFinance } from './lib/use-finance';
import {
  ArrowDown,
  ArrowRightLeft,
  ArrowUp,
  Bell,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Plus,
  QrCode,
  Search,
  BellRing,
} from 'lucide-react';
import BottomNav from './components/BottomNav';
import { BUDGET_ON_BRAND, ON_BRAND, PALETTE } from './lib/colors';
import './styles/home.css';

// Đề xuất: mỗi chức năng một màu có nghĩa. Giá vàng dùng chữ "Au" đúng màu vàng
const suggestions: { label: string; color: string; Icon?: typeof BellRing; mark?: string }[] = [
  { Icon: ArrowRightLeft, label: 'Quy đổi tiền tệ', color: PALETTE.teal },
  { mark: 'Au', label: 'Giá vàng', color: PALETTE.gold },
  { Icon: BellRing, label: 'Lời nhắc', color: PALETTE.indigo },
];

const WEEKDAYS = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const UNREAD_NOTIFICATIONS = 0;

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';
const pad = (n: number) => String(n).padStart(2, '0');
const monthKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
const monthLabel = (d: Date) => `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
const dayLabel = (d: Date) =>
  `${WEEKDAYS[d.getDay()]}, ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;

// Ngân sách: xanh khi dưới 70%, vàng từ 70% đến 90%, đỏ khi vượt 90%
const budgetColor = (percent: number) =>
  percent > 90 ? BUDGET_ON_BRAND.alert : percent > 70 ? BUDGET_ON_BRAND.warning : BUDGET_ON_BRAND.ok;

export default function Home({ initialDate }: { initialDate: string }) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [month, setMonth] = useState(() => new Date(`${initialDate.slice(0, 7)}-01T12:00:00`));
  const [day, setDay] = useState(() => new Date(`${initialDate}T12:00:00`));

  const shiftMonth = (delta: number) =>
    setMonth((d) => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  const shiftDay = (delta: number) =>
    setDay((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + delta));

  const isMonth = viewMode === 'month';
  const start = isMonth ? `${monthKey(month)}-01` : dateKey(day);
  const end = isMonth ? dateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0)) : start;
  const { data: totals, error, loading } = useFinance(start, end);
  const remaining = totals.income - totals.expense;

  return (
    <div className="app-page">
      <header className="home-header">
        <div className="header-top">
          <label className="home-search">
            <Search size={18} strokeWidth={1.8} />
            <input type="text" placeholder="Tìm giao dịch và nhấn Enter" aria-label="Tìm kiếm giao dịch" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') router.push(`/history?q=${encodeURIComponent(search)}`); }} />
          </label>
          <button type="button" className="icon-btn" aria-label="Thông báo">
            <Bell size={22} strokeWidth={1.8} />
            {UNREAD_NOTIFICATIONS > 0 && (
              <span className="notif-badge">{UNREAD_NOTIFICATIONS}</span>
            )}
          </button>
          <button type="button" className="icon-btn" aria-label="Tin nhắn">
            <MessageCircle size={22} strokeWidth={1.8} />
          </button>
        </div>
      </header>

      {loading && <p className="data-status" role="status">Đang tải dữ liệu…</p>}
      {error && <p className="data-status" role="alert">{error} <Link href="/login">Đăng nhập</Link></p>}
      <section className="card summary-card">
        <div className="home-segmented">
          <span className={`home-segmented-thumb ${isMonth ? '' : 'is-right'}`} />
          <button
            type="button"
            className={`home-segmented-btn ${isMonth ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Tháng
          </button>
          <button
            type="button"
            className={`home-segmented-btn ${!isMonth ? 'active' : ''}`}
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
            <ChevronLeft size={18} />
          </button>
          <span className="period-nav-label">{isMonth ? monthLabel(month) : dayLabel(day)}</span>
          <button
            type="button"
            className="period-nav-btn"
            aria-label={isMonth ? 'Tháng sau' : 'Ngày sau'}
            onClick={() => (isMonth ? shiftMonth(1) : shiftDay(1))}
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">
              <ArrowDown size={14} strokeWidth={2} style={{ color: ON_BRAND.income }} />
              Thu
            </span>
            <p className="stat-value" style={{ color: ON_BRAND.income }}>
              {formatMoney(totals.income)}
            </p>
          </div>
          <div className="stat-item">
            <span className="stat-label">
              <ArrowUp size={14} strokeWidth={2} style={{ color: ON_BRAND.expense }} />
              Chi
            </span>
            <p className="stat-value" style={{ color: ON_BRAND.expense }}>
              {formatMoney(totals.expense)}
            </p>
          </div>
          <div className="stat-item">
            <span className="stat-label">Còn lại</span>
            <p className="stat-value stat-main">{formatMoney(remaining)}</p>
          </div>
        </div>

        {isMonth ? (
          <div className="budget-section">
            <div className="budget-info">
              <span>{totals.budgetAmount ? 'Ngân sách' : 'Chưa đặt ngân sách'}</span>
              <span className="budget-percent" style={{ color: budgetColor(totals.budget) }}>
                {totals.budget}%
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(totals.budget, 100)}%`,
                  backgroundColor: budgetColor(totals.budget),
                }}
              />
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
        <Link href="/transactions/new" className="btn-primary">
          <Plus size={18} strokeWidth={2} />
          Ghi giao dịch
        </Link>
        <button type="button" className="btn-secondary">
          <QrCode size={18} strokeWidth={1.8} />
          QR của tôi
        </button>
      </div>

      <section className="suggestions-section">
        <h3 className="section-title">Đề xuất</h3>
        <div className="suggestion-grid">
          {suggestions.map(({ Icon, mark, label, color }) => (
            <button key={label} type="button" className="suggestion-card">
              <span
                className="suggestion-icon"
                style={{ backgroundColor: `${color}24`, color }}
              >
                {Icon ? (
                  <Icon size={22} strokeWidth={1.8} />
                ) : (
                  <span className="suggestion-mark">{mark}</span>
                )}
              </span>
              <span className="suggestion-text">{label}</span>
            </button>
          ))}
        </div>
      </section>

      <BottomNav />
    </div>
  );
}
