import 'server-only';
import { cookies } from 'next/headers';
import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { RowDataPacket } from 'mysql2/promise';
import { atomic, database, rows } from './db';
import { HttpError } from './http';

const scrypt = promisify(nodeScrypt);
const COOKIE = 'cnpm_session';
const MAX_AGE = 60 * 60 * 24 * 7;
export type CurrentUser = { id: string; name: string; account: string; role: 'user' | 'admin' };
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const key = await scrypt(password, salt, 64) as Buffer;
    return `scrypt:${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    const [algorithm, salt, hex] = hash.split(':');
    if (algorithm !== 'scrypt' || !salt || !hex || hex.length !== 128) return false;
    const key = await scrypt(password, salt, 64) as Buffer;
    return timingSafeEqual(key, Buffer.from(hex, 'hex'));
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
    const token = (await cookies()).get(COOKIE)?.value;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
    const users = await rows<RowDataPacket & CurrentUser>(`SELECT u.id, u.name, u.account, u.role
        FROM sessions s JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.blocked = FALSE`, [hashToken(token)]);
    return users[0] ? { id: users[0].id, name: users[0].name, account: users[0].account, role: users[0].role } : null;
}

export async function requireUser(): Promise<CurrentUser> {
    const user = await getCurrentUser();
    if (!user) throw new HttpError(401, 'Bạn cần đăng nhập.');
    return user;
}

export async function createSession(userId: string): Promise<void> {
    await destroySession();
    const token = randomBytes(32).toString('hex');
    await database().execute('DELETE FROM sessions WHERE expires_at <= UTC_TIMESTAMP()');
    await atomic(async (connection) => {
        // Serialize session issuance with blocking so a blocked user cannot get a new session in a race.
        const [users] = await connection.execute<RowDataPacket[]>('SELECT blocked FROM users WHERE id = ? FOR UPDATE', [userId]);
        if (!users[0] || users[0].blocked) throw new HttpError(401, 'Tài khoản không thể đăng nhập.');
        await connection.execute('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
            [hashToken(token), userId, new Date(Date.now() + MAX_AGE * 1000)]);
    });
    (await cookies()).set(COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
        secure: process.env.COOKIE_SECURE === 'true' || (process.env.COOKIE_SECURE !== 'false' && process.env.NODE_ENV === 'production') });
}

export async function destroySession(): Promise<void> {
    const jar = await cookies();
    const token = jar.get(COOKIE)?.value;
    if (token) await database().execute('DELETE FROM sessions WHERE token_hash = ?', [hashToken(token)]);
    jar.delete(COOKIE);
}
