'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, Menu, Send, Sparkles } from 'lucide-react';
import '../styles/chat.css';

type Message = { id: number; role: 'ai' | 'user'; text: string };

const QUICK_PROMPTS = [
  'Tháng này tôi chi bao nhiêu?',
  'Ngân sách còn lại thế nào?',
  'Gợi ý cách tiết kiệm',
];

// TODO: lấy tên người dùng từ phiên đăng nhập khi có backend
const USER_NAME = 'Loan';

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  const send = (text: string) => {
    const content = text.trim();
    if (!content) return;
    setMessages((prev) => [...prev, { id: prev.length, role: 'user', text: content }]);
    setInput('');

    // TODO: gọi API trợ lý AI thật. Hiện trả lời mẫu.
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: prev.length,
          role: 'ai',
          text: 'Tính năng trợ lý AI đang được phát triển. Hiện mình chỉ trả lời mẫu.',
        },
      ]);
    }, 600);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="chat-page">
      <header className="chat-header">
        <Link href="/" className="chat-round-btn" aria-label="Quay lại">
          <ArrowLeft size={20} strokeWidth={1.8} />
        </Link>
        <h1 className="chat-title">Trợ lý AI - Ting Ting</h1>
      </header>

      <div className="chat-body">
        {isEmpty ? (
          <div className="chat-welcome">
            <span className="chat-avatar">
              <Sparkles size={22} strokeWidth={1.8} />
            </span>
            <h2 className="chat-welcome-title">
              Chào {USER_NAME}, trợ lý có thể giúp gì cho bạn?
            </h2>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role}`}>
                {m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="chat-prompts">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} type="button" className="prompt-chip" onClick={() => send(p)}>
              {p}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-row">
        <button type="button" className="chat-round-btn chat-menu-btn" aria-label="Menu">
          <Menu size={20} strokeWidth={1.8} />
        </button>
        <form
          className="chat-input-pill"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            className="chat-input"
            type="text"
            placeholder="Hỏi trợ lý..."
            aria-label="Nhập câu hỏi"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          {input.trim() ? (
            <button type="submit" className="chat-send" aria-label="Gửi">
              <Send size={18} strokeWidth={2} />
            </button>
          ) : (
            // TODO: nhập liệu bằng giọng nói khi có tính năng này
            <button type="button" className="chat-voice" aria-label="Nói">
              <span>Nói</span>
              <Mic size={18} strokeWidth={1.8} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
