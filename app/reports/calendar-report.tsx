'use client';

import { useState } from 'react';
import type { Finance } from '../lib/client-api';
import { useFinance } from '../lib/use-finance';

const money = (n: number) => n.toLocaleString('vi-VN') + 'đ';
const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 });

export default function CalendarReport({ start, end, today, selected, select, data, loading, error }: {
  start: string; end: string; today: string; selected: string; select: (day: string) => void;
  data: Finance; loading: boolean; error: string;
}) {
  const day = selected.startsWith(start.slice(0, 7)) ? selected : start;
  const [page, setPage] = useState(1);
  const report = useFinance(day, day, '', page);
  const offset = (new Date(`${start}T12:00:00`).getDay() + 6) % 7;
  return <>
    <section className="report-calendar" aria-label="Lịch thu chi">
      <div className="calendar-grid">
        {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <span className="calendar-weekday" key={label}>{label}</span>)}
        {Array.from({ length: offset }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: Number(end.slice(8)) }, (_, i) => {
          const date = `${start.slice(0, 8)}${String(i + 1).padStart(2, '0')}`;
          const totals = data.daily?.find(row => row.date === date);
          const income = Number(totals?.income || 0);
          const expense = Number(totals?.expense || 0);
          return <button type="button" key={date} className="calendar-day" aria-pressed={day === date} aria-current={date === today ? 'date' : undefined} aria-label={`${date}, thu ${money(income)}, chi ${money(expense)}`} onClick={() => { select(date); setPage(1); }}>
            <span>{i + 1}</span>
            {!loading && !error && income !== 0 && <small className="text-income">{income >= 0 ? '+' : '−'}{compact.format(Math.abs(income))}</small>}
            {!loading && !error && expense !== 0 && <small className="text-expense">{expense >= 0 ? '−' : '+'}{compact.format(Math.abs(expense))}</small>}
          </button>;
        })}
      </div>
      {!loading && !error && <><h2>Tổng kết tháng</h2><dl className="calendar-summary">
        <div><dt>Tổng thu</dt><dd className="text-income">{money(data.income)}</dd></div>
        <div><dt>Tổng chi</dt><dd className="text-expense">{money(data.expense)}</dd></div>
        <div><dt>Chênh lệch</dt><dd>{money(data.income - data.expense)}</dd></div>
      </dl></>}
    </section>
    <section className="calendar-transactions" aria-live="polite">
      <h2>Ngày {day.slice(8)}/{day.slice(5, 7)}/{day.slice(0, 4)}</h2>
      {report.loading ? <p role="status">Đang tải giao dịch…</p> : report.error ? <p role="alert">{report.error}</p> : <>
        <p>Thu: {money(report.data.income)} · Chi: {money(report.data.expense)}</p>
        {!report.data.transactions.length && <p>Không có giao dịch trong ngày.</p>}
        {report.data.transactions.map(t => <div className="category-row" key={t.id}>
          <div className="calendar-entry"><strong>{t.note || t.category || 'Chuyển khoản'}</strong><small>{t.wallet}{t.reversesId ? ' · Hoàn tác' : t.reversed ? ' · Đã hoàn tác' : ''}</small></div>
          <span className={t.kind === 'expense' ? 'text-expense' : t.kind === 'income' ? 'text-income' : ''}>{t.kind === 'transfer' ? '' : (t.kind === 'income') !== Boolean(t.reversesId) ? '+' : '−'}{money(Number(t.amount))}</span>
        </div>)}
        {(page > 1 || report.data.hasMore) && <div className="calendar-pagination">
          <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Trang trước</button>
          <span>Trang {page}</span>
          <button type="button" disabled={!report.data.hasMore} onClick={() => setPage(page + 1)}>Trang sau</button>
        </div>}
      </>}
    </section>
  </>;
}
