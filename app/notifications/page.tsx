'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, ArrowDownLeft, Wallet } from 'lucide-react';
import { KIND_COLOR, NOTIFICATIONS, unreadCount, type NotificationKind } from '../lib/notifications';
import '../styles/notifications.css';

const KIND_ICON: Record<NotificationKind, typeof Wallet> = {
  budget: Wallet,
  income: ArrowDownLeft,
  reminder: BellRing,
};

export default function NotificationsPage() {
  const [items, setItems] = useState(NOTIFICATIONS);

  const markRead = (id: number) =>
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

  const markAllRead = () => setItems((prev) => prev.map((n) => ({ ...n, read: true })));

  const unread = unreadCount(items);

  return (
    <div className="notif-page">
      <header className="notif-header">
        <Link href="/" className="notif-round-btn" aria-label="Quay lại">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 className="notif-title">Thông báo</h1>
        {unread > 0 && (
          <button type="button" className="notif-mark-all" onClick={markAllRead}>
            Đọc tất cả
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <div className="notif-empty">
          <p className="notif-empty-title">Chưa có thông báo nào</p>
          <p className="notif-empty-text">Các thông báo về ngân sách và giao dịch sẽ hiển thị tại đây.</p>
        </div>
      ) : (
        <ul className="notif-list">
          {items.map((n) => {
            const Icon = KIND_ICON[n.kind];
            const color = KIND_COLOR[n.kind];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-item ${n.read ? '' : 'unread'}`}
                  onClick={() => markRead(n.id)}
                >
                  <span className="notif-icon" style={{ backgroundColor: `${color}24`, color }}>
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <span className="notif-content">
                    <span className="notif-item-title">{n.title}</span>
                    <span className="notif-item-body">{n.body}</span>
                    <span className="notif-item-time">{n.time}</span>
                  </span>
                  {!n.read && <span className="notif-dot" aria-label="Chưa đọc" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
