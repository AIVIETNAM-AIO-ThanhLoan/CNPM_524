'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ReceiptText, Search } from 'lucide-react';
import { dateKey } from '../lib/client-api';
import { useFinance } from '../lib/use-finance';
import BottomNav from '../components/BottomNav';
import '../styles/history.css';

const formatMoney = (amount: number) => amount.toLocaleString('vi-VN') + 'đ';

export default function History({ initialDate, initialSearch }: { initialDate: string; initialSearch: string }) {
  const [month, setMonth] = useState(initialDate.slice(0, 7));
  const [search, setSearch] = useState(initialSearch);
  const end = /^\d{4}-\d{2}$/.test(month) ? dateKey(new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)) : '';
  const { data, error, loading } = useFinance(`${month}-01`, end, search);
  const transactions = data.transactions;
  const totalIncome = data.income;
  const totalExpense = data.expense;
  const monthLabel = `Tháng ${month.slice(5, 7)}/${month.slice(0, 4)}`;

  return (
    <div className="app-page">
      <header className="page-header history-header">
        <h1 className="page-title">Lịch sử</h1>
        <label>Tháng <input type="month" min="1000-01" max="9999-12" value={month} onChange={(e) => { if (e.target.value) setMonth(e.target.value); }} /></label>
      </header>

      <label className="search-bar">
        <Search size={20} strokeWidth={1.8} />
        <input
          className="search-input"
          type="text"
          placeholder="Tìm kiếm giao dịch"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      <section className="card history-summary">
        <h2 className="history-summary-title">Tổng quan {monthLabel.toLowerCase()}</h2>
        <div className="summary-pair">
          <div className="stat-box">
            <span className="stat-label">Tổng thu</span>
            <p className="stat-amount text-income">{formatMoney(totalIncome)}</p>
          </div>
          <div className="stat-box">
            <span className="stat-label">Tổng chi</span>
            <p className="stat-amount text-expense">{formatMoney(totalExpense)}</p>
          </div>
        </div>
      </section>

      <p className="data-status"><Link href="/transactions/new">+ Ghi giao dịch</Link> · Hiển thị tối đa 200 giao dịch gần nhất trong kỳ; tổng thu/chi tính toàn kỳ.</p>
      {loading && <p className="data-status" role="status">Đang tải dữ liệu…</p>}
      {error && <p className="data-status" role="alert">{error} <Link href="/login">Đăng nhập</Link></p>}
      {!loading && !error && (transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">
            <ReceiptText size={36} strokeWidth={1.6} />
          </div>
          <p className="empty-title">Không có giao dịch phù hợp</p>
          <p className="empty-text">Các giao dịch bạn ghi sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <section className="history-group">
          <h3 className="history-group-title">{monthLabel}</h3>
          <div className="tx-list">
            {transactions.map(({ id, note, category, bookedOn, amount, kind, wallet, target }) => (
              <div key={id} className="tx-item">
                <div className="tx-info">
                  <span className="tx-icon">
                    <ReceiptText size={20} strokeWidth={1.8} />
                  </span>
                  <div>
                    <p className="tx-title">{note || category || 'Chuyển tiền'}</p>
                    <p className="tx-time">{bookedOn} · {wallet}{target ? ` → ${target}` : ''}</p>
                  </div>
                </div>
                <span
                  className={`tx-amount ${kind === 'income' ? 'text-income' : kind === 'expense' ? 'text-expense' : ''}`}
                >
                  {kind === 'income' ? '+' : kind === 'expense' ? '-' : '↔ '}
                  {formatMoney(Number(amount))}
                </span>
              </div>
            ))}
          </div>
        </section>
      ))}

      <BottomNav />
    </div>
  );
}
