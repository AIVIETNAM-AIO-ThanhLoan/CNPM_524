'use client';

import React, { useMemo, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash2 } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import '../styles/reminders.css';

type Reminder = { id: string; title: string; date: string; time?: string };

// Lời nhắc lưu trong trình duyệt. TODO: chuyển sang database khi có bảng lời nhắc.
const STORAGE_KEY = 'cnpm.reminders';
const DEFAULT_TIME = '08:00';

const subscribe = (notify: () => void) => {
    window.addEventListener('storage', notify);
    return () => window.removeEventListener('storage', notify);
};
const readRaw = () => {
    try {
        return localStorage.getItem(STORAGE_KEY) ?? '';
    } catch {
        return '';
    }
};
const serverRaw = () => '';

function parseReminders(raw: string): Reminder[] {
    if (!raw) return [];
    try {
        return JSON.parse(raw) as Reminder[];
    } catch {
        return [];
    }
}

function writeReminders(items: Reminder[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
        // Trình duyệt chặn lưu trữ thì lời nhắc chỉ còn trong phiên hiện tại.
    }
    window.dispatchEvent(new Event('storage'));
}

// Sắp theo ngày, rồi theo giờ; lời nhắc cũ không có giờ đứng sau cùng trong ngày
const byDateTime = (a: Reminder, b: Reminder) =>
    a.date.localeCompare(b.date) || (a.time ?? '99:99').localeCompare(b.time ?? '99:99');

const formatWhen = (r: Reminder) => {
    const [y, m, d] = r.date.split('-');
    return r.time ? `${d}/${m}/${y} · ${r.time}` : `${d}/${m}/${y}`;
};

export default function RemindersPage() {
    const raw = useSyncExternalStore(subscribe, readRaw, serverRaw);
    const items = useMemo(() => parseReminders(raw), [raw]);
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState(DEFAULT_TIME);

    const update = (next: Reminder[]) => {
        writeReminders([...next].sort(byDateTime));
    };

    const add = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !date || !time) return;
        update([...items, { id: crypto.randomUUID(), title: title.trim(), date, time }]);
        setTitle('');
        setDate('');
        setTime(DEFAULT_TIME);
    };

    return (
        <div className="app-page">
            <header className="page-header reminders-header">
                <Link href="/" className="reminders-back" aria-label="Quay lại">
                    <ArrowLeft size={20} strokeWidth={1.8} />
                </Link>
                <h1 className="page-title">Lời nhắc</h1>
            </header>

            <form className="card reminder-form" onSubmit={add}>
                <input
                    type="text"
                    placeholder="Nội dung nhắc, ví dụ: Trả tiền nhà"
                    aria-label="Nội dung nhắc"
                    maxLength={100}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <div className="reminder-row">
                    <input type="date" aria-label="Ngày nhắc" value={date} onChange={(e) => setDate(e.target.value)} />
                    <input type="time" aria-label="Giờ nhắc" value={time} onChange={(e) => setTime(e.target.value)} />
                </div>
                <button type="submit" className="btn-primary" disabled={!title.trim() || !date || !time}>
                    Thêm lời nhắc
                </button>
            </form>

            <section className="reminder-list">
                {items.length === 0 ? (
                    <p className="data-status">Chưa có lời nhắc nào.</p>
                ) : (
                    [...items].sort(byDateTime).map((r) => (
                        <div key={r.id} className="card reminder-item">
                            <div>
                                <p className="reminder-title">{r.title}</p>
                                <p className="reminder-date">{formatWhen(r)}</p>
                            </div>
                            <button
                                type="button"
                                className="reminder-delete"
                                aria-label={`Xóa lời nhắc ${r.title}`}
                                onClick={() => update(items.filter((x) => x.id !== r.id))}
                            >
                                <Trash2 size={18} strokeWidth={1.8} />
                            </button>
                        </div>
                    ))
                )}
            </section>

            <BottomNav />
        </div>
    );
}
