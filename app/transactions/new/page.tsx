'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Banknote,
  Car,
  Check,
  Gift,
  GraduationCap,
  House,
  ShoppingBag,
  UtensilsCrossed,
  Wallet,
} from 'lucide-react';
import { PALETTE } from '../../lib/colors';
import '../../styles/transaction.css';

type TxType = 'expense' | 'income';
type Category = { name: string; Icon: typeof Wallet; color: string };

// TODO: lấy danh mục từ database. Hiện là danh mục mẫu.
const CATEGORIES: Record<TxType, Category[]> = {
  expense: [
    { name: 'Ăn uống', Icon: UtensilsCrossed, color: PALETTE.expense },
    { name: 'Tiền nhà', Icon: House, color: PALETTE.brand },
    { name: 'Đi lại', Icon: Car, color: PALETTE.teal },
    { name: 'Học tập', Icon: GraduationCap, color: PALETTE.indigo },
    { name: 'Mua sắm', Icon: ShoppingBag, color: PALETTE.gold },
  ],
  income: [
    { name: 'Lương', Icon: Banknote, color: PALETTE.income },
    { name: 'Thưởng', Icon: Gift, color: PALETTE.gold },
    { name: 'Khác', Icon: Wallet, color: PALETTE.teal },
  ],
};

// Ngày mặc định cố định để server và trình duyệt hiển thị giống nhau
const DEFAULT_DATE = '2026-10-13';

export default function NewTransactionPage() {
  const [type, setType] = useState<TxType>('expense');
  const [amountDigits, setAmountDigits] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [date, setDate] = useState(DEFAULT_DATE);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);

  const amount = Number(amountDigits || 0);
  const canSave = amount > 0 && category !== null;

  const switchType = (next: TxType) => {
    setType(next);
    setCategory(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    // TODO: lưu giao dịch vào database. Hiện chỉ hiển thị thông báo.
    setSaved(true);
  };

  if (saved) {
    return (
      <div className="tx-page">
        <div className="tx-success">
          <span className="tx-success-icon">
            <Check size={32} strokeWidth={2.4} />
          </span>
          <h1 className="tx-success-title">Đã ghi giao dịch</h1>
          <p className="tx-success-text">
            {type === 'expense' ? 'Chi' : 'Thu'} {amount.toLocaleString('vi-VN')}đ cho {category}.
          </p>
          <Link href="/" className="btn-primary tx-success-btn">
            Về trang chủ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-page">
      <header className="tx-header">
        <Link href="/" className="tx-round-btn" aria-label="Quay lại">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 className="tx-title">Ghi giao dịch</h1>
      </header>

      <form className="tx-form" onSubmit={save}>
        <div className="tx-type-switch">
          <span className={`tx-type-thumb ${type === 'income' ? 'is-right' : ''}`} />
          <button
            type="button"
            className={`tx-type-btn ${type === 'expense' ? 'active' : ''}`}
            onClick={() => switchType('expense')}
          >
            Chi tiêu
          </button>
          <button
            type="button"
            className={`tx-type-btn ${type === 'income' ? 'active' : ''}`}
            onClick={() => switchType('income')}
          >
            Thu nhập
          </button>
        </div>

        <label className="tx-amount-box">
          <span className="tx-amount-label">Số tiền</span>
          <span className="tx-amount-row">
            <input
              className="tx-amount-input"
              type="text"
              inputMode="numeric"
              placeholder="0"
              aria-label="Số tiền"
              value={amountDigits ? Number(amountDigits).toLocaleString('vi-VN') : ''}
              onChange={(e) => setAmountDigits(e.target.value.replace(/\D/g, ''))}
            />
            <span className="tx-amount-unit">đ</span>
          </span>
        </label>

        <section className="tx-section">
          <h2 className="tx-section-title">Danh mục</h2>
          <div className="tx-categories">
            {CATEGORIES[type].map(({ name, Icon, color }) => {
              const selected = category === name;
              return (
                <button
                  key={name}
                  type="button"
                  className={`tx-category ${selected ? 'selected' : ''}`}
                  onClick={() => setCategory(name)}
                  aria-pressed={selected}
                >
                  <span className="tx-category-icon" style={{ backgroundColor: `${color}24`, color }}>
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="tx-category-name">{name}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="tx-fields">
          <label className="tx-field">
            <span className="tx-field-label">Ngày</span>
            <input
              className="tx-field-input"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="tx-field">
            <span className="tx-field-label">Ghi chú</span>
            <input
              className="tx-field-input"
              type="text"
              placeholder="Ví dụ: cà phê với bạn"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
        </section>

        <button type="submit" className="btn-primary tx-save" disabled={!canSave}>
          Lưu giao dịch
        </button>
      </form>
    </div>
  );
}
