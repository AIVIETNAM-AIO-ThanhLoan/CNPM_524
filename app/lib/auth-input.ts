import 'server-only';
import { createHash } from 'node:crypto';
import { HttpError, text } from './http';

export function accountInput(value: unknown): string {
    const account = text(value, 'Email hoặc số điện thoại', 190).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account) && !/^\+?\d{9,15}$/.test(account)) throw new HttpError(400, 'Nhập email hoặc số điện thoại hợp lệ.');
    return account;
}

export function passwordInput(value: unknown): string {
    if (typeof value !== 'string' || value.length < 8 || value.length > 128) throw new HttpError(400, 'Mật khẩu cần từ 8 đến 128 ký tự.');
    return value;
}

// Local single-process throttle. Replace with a shared store when scaling out.
const authGlobal = globalThis as typeof globalThis & { cnpmAttempts?: Map<string, { count: number; until: number }> };
const attempts = authGlobal.cnpmAttempts ??= new Map();
export function throttle(account: string): void {
    const now = Date.now();
    for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key);
    const key = createHash('sha256').update(account).digest('hex');
    const entry = attempts.get(key) || { count: 0, until: now + 15 * 60 * 1000 };
    if (entry.count >= 15 || (!attempts.has(key) && attempts.size >= 10000)) throw new HttpError(429, 'Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút.');
    entry.count++;
    attempts.set(key, entry);
}
