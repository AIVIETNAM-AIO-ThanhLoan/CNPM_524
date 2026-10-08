'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, Bell, Coins, Plus, QrCode, Users } from 'lucide-react';
import BottomNav from './components/BottomNav';
import './styles/home.css';

const suggestions = [
  { Icon: ArrowRightLeft, label: 'Quy đổi tiền tệ' },
  { Icon: Coins, label: 'Giá vàng' },
  { Icon: Users, label: 'Chia tiền nhóm' },
];

export default function Home() {
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');

  return (
    <div className="app-page">
      <header className="home-header">
        <div className="header-top">
          <h1 className="greeting">Xin chào, Loan</h1>
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
            className={`segmented-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Tháng
          </button>
          <button
            type="button"
            className={`segmented-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            Ngày
          </button>
        </div>

        <h2 className="card-title">Tháng 10/2026</h2>

        <div className="stats-row">
          <div className="stat-item">
            <span className="stat-label">Thu</span>
            <p className="stat-value text-income">12.000.000đ</p>
          </div>
          <div className="stat-item">
            <span className="stat-label">Chi</span>
            <p className="stat-value text-expense">7.450.000đ</p>
          </div>
          <div className="stat-item">
            <span className="stat-label">Còn lại</span>
            <p className="stat-value remaining">4.550.000đ</p>
          </div>
        </div>

        <div className="budget-section">
          <div className="budget-info">
            <span>Ngân sách</span>
            <span className="budget-percent">62%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: '62%' }} />
          </div>
        </div>
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
          {suggestions.map(({ Icon, label }) => (
            <button key={label} type="button" className="suggestion-card">
              <span className="suggestion-icon">
                <Icon size={22} strokeWidth={1.8} />
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
