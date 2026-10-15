'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChartColumn, CircleUserRound, House, QrCode, ReceiptText } from 'lucide-react';
import '../styles/bottom-nav.css';

const navItems = [
  { href: '/', label: 'Trang chủ', Icon: House },
  { href: '/reports', label: 'Báo cáo', Icon: ChartColumn },
  { href: '/history', label: 'Lịch sử', Icon: ReceiptText },
  { href: '/profile', label: 'Tôi', Icon: CircleUserRound },
];

// Hai mục đầu đặt bên trái nút QR, hai mục sau đặt bên phải
const leftItems = navItems.slice(0, 2);
const rightItems = navItems.slice(2);

export default function BottomNav() {
  const pathname = usePathname();

  const renderItem = ({ href, label, Icon }: (typeof navItems)[number]) => (
    <Link
      key={href}
      href={href}
      className={`nav-item ${pathname === href ? 'nav-active' : ''}`}
    >
      <Icon size={24} strokeWidth={1.8} />
      <span>{label}</span>
    </Link>
  );

  return (
    <nav className="bottom-nav">
      {leftItems.map(renderItem)}
      <Link href="/scan" className="nav-qr" aria-label="Quét QR">
        <QrCode size={28} strokeWidth={1.8} />
      </Link>
      {rightItems.map(renderItem)}
    </nav>
  );
}
