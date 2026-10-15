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

// Local single-process limiter. Replace with a shared store when scaling out.
// Only failed attempts are counted; a successful login clears the record.
const MAX_FAILURES = 15;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10000;
type Entry = { count: number; until: number };
const authGlobal = globalThis as typeof globalThis & { cnpmAttempts?: Map<string, Entry> };
const attempts = authGlobal.cnpmAttempts ??= new Map<string, Entry>();
const keyOf = (key: string) => createHash('sha256').update(key).digest('hex');

function prune(now: number): void {
    for (const [id, entry] of attempts) if (entry.until <= now) attempts.delete(id);
}

export function assertNotThrottled(key: string): void {
    prune(Date.now());
    const id = keyOf(key);
    const entry = attempts.get(id);
    if (entry ? entry.count >= MAX_FAILURES : attempts.size >= MAX_TRACKED) {
        throw new HttpError(429, 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.');
    }
}

export function recordFailure(key: string): void {
    const now = Date.now();
    prune(now);
    const id = keyOf(key);
    const entry = attempts.get(id);
    if (entry) entry.count++;
    else if (attempts.size < MAX_TRACKED) attempts.set(id, { count: 1, until: now + WINDOW_MS });
}

export function clearFailures(key: string): void {
    attempts.delete(keyOf(key));
}
