'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Menu, Send, Sparkles } from 'lucide-react';
import '../styles/chat.css';

// error: tin báo lỗi, chỉ hiển thị, không gửi lại cho trợ lý
type Message = { id: string; role: 'ai' | 'user'; text: string; error?: boolean };

const QUICK_PROMPTS = [
  'Tháng này tôi chi bao nhiêu?',
  'Ngân sách còn lại thế nào?',
  'Gợi ý cách tiết kiệm',
];

// Server gửi ký tự này khi cần bỏ phần câu trả lời đã hiển thị
const RESET = '\u001e';

// Khung chat hiển thị chữ thường, nên bỏ các ký hiệu markdown còn sót trong câu trả lời
const plainText = (text: string) =>
  text
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '$1 ($2)')
    .replace(/\*\*|__/g, '')
    .replace(/^#{1,6}\s+/gm, '');

export default function ChatClient({ userName }: { userName: string | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);

  const updateReply = (id: string, text: string, error = false) =>
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, text, error } : m)));

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;

    const history = [...messages.filter((m) => !m.error && m.text), { id: crypto.randomUUID(), role: 'user' as const, text: content }];
    const replyId = crypto.randomUUID();
    setMessages((prev) => [...prev, history[history.length - 1], { id: replyId, role: 'ai', text: '' }]);
    setInput('');
    setBusy(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })),
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        updateReply(replyId, data.error || 'Không thể kết nối tới trợ lý.', true);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let received = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += decoder.decode(value, { stream: true });
        updateReply(replyId, received.slice(received.lastIndexOf(RESET) + 1));
      }
      if (!received.trim()) updateReply(replyId, 'Trợ lý không có câu trả lời. Vui lòng thử lại.', true);
    } catch {
      updateReply(replyId, 'Không thể kết nối tới trợ lý.', true);
    } finally {
      setBusy(false);
    }
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
              {userName ? `Chào ${userName}, trợ lý có thể giúp gì cho bạn?` : 'Chào bạn, trợ lý có thể giúp gì cho bạn?'}
            </h2>
          </div>
        ) : (
          <div className="chat-messages" aria-live="polite">
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role}${m.error ? ' error' : ''}`}>
                {m.role === 'ai' ? plainText(m.text) || 'Đang trả lời…' : m.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {isEmpty && (
        <div className="chat-prompts">
          {QUICK_PROMPTS.map((p) => (
            <button key={p} type="button" className="prompt-chip" onClick={() => send(p)} disabled={busy}>
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
            maxLength={2000}
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" className="chat-send" aria-label="Gửi" disabled={busy || !input.trim()}>
            <Send size={18} strokeWidth={2} />
          </button>
        </form>
      </div>
    </div>
  );
}
