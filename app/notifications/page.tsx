'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BellRing, ArrowDownLeft, Wallet } from 'lucide-react';
import { formatDateTime } from '../lib/client-api';
import { KIND_COLOR, type NotificationKind } from '../lib/notifications';
import { useNotifications } from '../lib/use-notifications';
import PushSettings from '../components/PushSettings';
import '../styles/notifications.css';

const KIND_ICON: Record<NotificationKind, typeof Wallet> = {
  budget: Wallet,
  income: ArrowDownLeft,
  reminder: BellRing,
};

export default function NotificationsPage() {
  const { items, unread, error, markRead } = useNotifications();

  return (
    <div className="notif-page">
      <header className="notif-header">
        <Link href="/" className="notif-round-btn" aria-label="Quay lại">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 className="notif-title">Thông báo</h1>
        {(
          <button type="button" className="notif-mark-all" disabled={!unread} onClick={() => markRead('all')}>
            Đọc tất cả
          </button>
        )}
      </header>
      <PushSettings />
      <p className="data-status"><Link href="/reminders">Quản lý khoản định kỳ</Link></p>
      {error && <p role="alert" className="ledger-error">{error}</p>}

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
                    <span className="notif-item-time">{formatDateTime(n.time)}</span>
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
