'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { dateKey, formatMoney } from '../lib/client-api';
import { useFinance } from '../lib/use-finance';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';
import {
  Banknote,
  CalendarDays,
  ChartNoAxesColumn,
  LocateFixed,
  Car,
  ChevronLeft,
  ChevronRight,
  Gift,
  GraduationCap,
  House,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import CalendarReport from './calendar-report';
import BottomNav from '../components/BottomNav';
import { colorAt } from '../lib/colors';
import '../styles/reports.css';

type Category = { name: string; amount: number };

const sumOf =(items: Category[]) => items.reduce((sum, item) => sum + item.amount, 0);

// Icon theo tên danh mục; danh mục khác dùng icon ví
const ICONS: Record<string, typeof Wallet> = {
  'Ăn uống': UtensilsCrossed,
  'Tiền nhà': House,
  'Đi lại': Car,
  'Học tập': GraduationCap,
  'Mua sắm': ShoppingBag,
  Lương: Banknote,
  Thưởng: Gift,
};
const iconFor = (name: string) => ICONS[name] ?? Wallet;

const daysBetween = (start: string, end: string) =>
  Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000) + 1;

export default function Reports({ initialDate }: { initialDate: string }) {
  const [screen, setScreen] = useState<'calendar' | 'details'>('calendar');
  const [selected, setSelected] = useState(initialDate);
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [anchor, setAnchor] = useState(() => new Date(`${initialDate}T12:00:00`));
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const saved = JSON.parse(sessionStorage.getItem('cnpm:reports-view') || 'null');
        const validDate = (value: unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && dateKey(new Date(`${value}T12:00:00`)) === value;
        if (saved?.today === initialDate && (saved.screen === 'calendar' || saved.screen === 'details') && (saved.viewMode === 'week' || saved.viewMode === 'month') && (saved.tab === 'expense' || saved.tab === 'income') && validDate(saved.selected) && validDate(saved.anchor)) {
          setScreen(saved.screen); setViewMode(saved.viewMode); setTab(saved.tab); setSelected(saved.selected); setAnchor(new Date(`${saved.anchor}T12:00:00`));
        }
      } catch { /* Storage may be unavailable or contain invalid data. */ }
      setRestored(true);
    });
    return () => { active = false; };
  }, [initialDate]);
  useEffect(() => {
    if (!restored) return;
    try { sessionStorage.setItem('cnpm:reports-view', JSON.stringify({ today: initialDate, screen, selected, viewMode, tab, anchor: dateKey(anchor) })); } catch { /* Navigation still works without storage. */ }
  }, [restored, initialDate, screen, selected, viewMode, tab, anchor]);
  const from = new Date(anchor);
  const to = new Date(anchor);
  if (screen === 'calendar' || viewMode === 'month') {
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
  const shift = (delta: number) => setAnchor((old) => screen === 'calendar' || viewMode === 'month'
    ? new Date(old.getFullYear(), old.getMonth() + delta, 1, 12)
    : new Date(old.getFullYear(), old.getMonth(), old.getDate() + delta * 7, 12));

  const period = {
    label: screen === 'calendar' || viewMode === 'month' ? `Tháng ${anchor.getMonth() + 1}/${anchor.getFullYear()}` : `Tuần ${startDate.slice(8)}/${startDate.slice(5, 7)} – ${endDate.slice(8)}/${endDate.slice(5, 7)}/${endDate.slice(0, 4)}`,
    range: `${startDate.slice(8)}/${startDate.slice(5, 7)} – ${endDate.slice(8)}/${endDate.slice(5, 7)}`,
    income: data.breakdown.filter((c) => c.kind === 'income').map((c): Category => ({ name: c.name, amount: Number(c.amount) })),
    expense: data.breakdown.filter((c) => c.kind === 'expense').map((c): Category => ({ name: c.name, amount: Number(c.amount) })),
  };

  const totalExpense = sumOf(period.expense);
  const totalIncome = sumOf(period.income);
  const difference = totalIncome - totalExpense;
  const avgExpensePerDay = totalExpense / daysBetween(startDate, endDate);

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
    <div className="app-page reports-page">
      <header className="report-navigation">
        <h1 className="report-sr-only">Báo cáo</h1>
        <div className="report-view-switch" data-view={screen} role="group" aria-label="Chế độ báo cáo">
          <button type="button" className={`report-view-button ${screen === 'calendar' ? 'active' : ''}`} aria-pressed={screen === 'calendar'} onClick={() => setScreen('calendar')}><CalendarDays size={15} aria-hidden="true" />Lịch</button>
          <button type="button" className={`report-view-button ${screen === 'details' ? 'active' : ''}`} aria-pressed={screen === 'details'} onClick={() => setScreen('details')}><ChartNoAxesColumn size={15} aria-hidden="true" />Chi tiết</button>
        </div>
        <div className="report-toolbar">
          {screen === 'details' ? <div className="report-range-switch" role="group" aria-label="Khoảng báo cáo">
            <button type="button" aria-pressed={viewMode === 'week'} onClick={() => setViewMode('week')}>Tuần</button>
            <button type="button" aria-pressed={viewMode === 'month'} onClick={() => setViewMode('month')}>Tháng</button>
          </div> : <span className="report-calendar-caption">Lịch giao dịch</span>}
          <button type="button" className="report-today" aria-label="Hôm nay" title="Hôm nay" onClick={() => { setAnchor(new Date(`${initialDate}T12:00:00`)); setSelected(initialDate); }}><LocateFixed size={14} aria-hidden="true" /></button>
        </div>
      </header>

      <div className="period-box">
        <button type="button" className="period-btn" aria-label="Kỳ trước" onClick={() => shift(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="period-center">
          <span className="period-text">{period.label}</span>
          <span className="period-range">{period.range}</span>
        </div>
        <button type="button" className="period-btn" aria-label="Kỳ sau" onClick={() => shift(1)}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && <SkeletonStatus />}
      {error && <p className="data-status" role="alert">{error} <Link href="/login">Đăng nhập</Link></p>}
      {!loading && !error && !data.breakdown.length && <p className="data-status">Chưa có thu/chi trong kỳ này.</p>}

      <div className="report-view-panel" key={screen}>
      {screen === 'calendar' ? <CalendarReport key={startDate} start={startDate} end={endDate} today={initialDate} selected={selected} select={day => { setSelected(day); setAnchor(new Date(`${day}T12:00:00`)); }} data={data} loading={loading} error={error} /> : <>
      <div className="stat-pair">
        <div className="stat-card stat-expense">
          <span className="stat-label">Chi tiêu</span>
          <span className="stat-amount">{loading ? <Skeleton width="70%" height={20} /> : `-${formatMoney(totalExpense)}`}</span>
        </div>
        <div className="stat-card stat-income">
          <span className="stat-label">Thu</span>
          <span className="stat-amount">{loading ? <Skeleton width="70%" height={20} /> : `+${formatMoney(totalIncome)}`}</span>
        </div>
      </div>

      <div className="stat-full">
        <span className="stat-label">Thu chi</span>
        <span className="stat-amount">
          {loading ? <Skeleton width={96} height={20} /> : `${difference >= 0 ? '+' : '-'}${formatMoney(Math.abs(difference))}`}
        </span>
      </div>
      <div className="stat-full">
        <span className="stat-label">Chi trung bình/ngày</span>
        <span className="stat-amount">{formatMoney(Math.round(avgExpensePerDay))}</span>
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
        {items.map(({ name, amount }, i) => {
          const color = colorAt(i);
          const Icon = iconFor(name);
          const percent = total === 0 ? 0 : (amount / total) * 100;
          // Bấm danh mục để xem các giao dịch của danh mục đó trong tháng
          const href = `/history?month=${startDate.slice(0, 7)}&q=${encodeURIComponent(name)}`;
          return (
            <Link key={name} href={href} className="category-row">
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
            </Link>
          );
        })}
      </section>

      </>}
      </div>
      <BottomNav />
    </div>
  );
}
