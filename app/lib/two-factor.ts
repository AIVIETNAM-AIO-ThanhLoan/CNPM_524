import 'server-only';
import { cookies } from 'next/headers';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { atomic, database } from './db';
import { HttpError } from './http';
import { assertNotThrottled, recordFailure } from './auth-input';
import { cookieSecure, createSession, hashToken } from './session';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;
const ISSUER = 'Ting Ting';
const CHALLENGE_COOKIE = 'cnpm_2fa';
const CHALLENGE_SECONDS = 5 * 60;
const MAX_CHALLENGE_ATTEMPTS = 5;
const BACKUP_CODE_COUNT = 8;

function base32Encode(buffer: Buffer): string {
    let bits = 0;
    let value = 0;
    let output = '';
    for (const byte of buffer) {
        value = ((value << 8) | byte) & 0xffff;
        bits += 8;
        while (bits >= 5) { output += ALPHABET[(value >>> (bits - 5)) & 31]; bits -= 5; }
    }
    if (bits > 0) output += ALPHABET[(value << (5 - bits)) & 31];
    return output;
}

function base32Decode(text: string): Buffer {
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of text.replace(/=+$/, '').toUpperCase()) {
        const index = ALPHABET.indexOf(char);
        if (index < 0) throw new Error('Invalid base32');
        value = ((value << 5) | index) & 0xffff;
        bits += 5;
        if (bits >= 8) { bytes.push((value >>> (bits - 8)) & 255); bits -= 8; }
    }
    return Buffer.from(bytes);
}

// RFC 4226/6238: HMAC-SHA1, 6 chữ số, bước 30 giây (tương thích Google Authenticator)
function hotp(key: Buffer, counter: number): string {
    const message = Buffer.alloc(8);
    message.writeBigUInt64BE(BigInt(counter));
    const digest = createHmac('sha1', key).update(message).digest();
    const offset = digest[digest.length - 1] & 15;
    return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, '0');
}

/** Trả về bước thời gian khớp mã, hoặc null. Cho lệch ±1 bước và từ chối bước đã dùng (chống dùng lại mã). */
export function verifyTotp(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
    if (!/^\d{6}$/.test(code)) return null;
    const key = base32Decode(secret);
    const current = Math.floor(now / 1000 / STEP_SECONDS);
    for (const step of [current - 1, current, current + 1]) {
        if (lastStep !== null && step <= lastStep) continue;
        if (timingSafeEqual(Buffer.from(hotp(key, step)), Buffer.from(code))) return step;
    }
    return null;
}

export const newTotpSecret = () => base32Encode(randomBytes(20));

export const otpauthUrl = (account: string, secret: string) =>
    `otpauth://totp/${encodeURIComponent(`${ISSUER}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(ISSUER)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;

/** Mã ngẫu nhiên dạng XXXX-XXXX..., bỏ các ký tự dễ nhầm (0/O, 1/I/L). */
export function newRecoveryCode(groups: number): string {
    const letters = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    return Array.from({ length: groups }, () => Array.from({ length: 4 }, () => letters[randomInt(letters.length)]).join('')).join('-');
}

/** Băm mã khôi phục sau khi bỏ dấu gạch, khoảng trắng và phân biệt hoa thường. */
export const hashRecoveryCode = (code: string) =>
    createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');

export function codeInput(value: unknown): string {
    if (typeof value !== 'string' || !value.trim() || value.length > 64) throw new HttpError(400, 'Nhập mã xác thực.');
    return value.trim();
}

/** Tạo bộ mã dự phòng mới cho 2FA, thay toàn bộ bộ cũ. Chỉ trả mã gốc một lần. */
export async function replaceBackupCodes(connection: PoolConnection, userId: string): Promise<string[]> {
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () => newRecoveryCode(2));
    await connection.execute('DELETE FROM totp_recovery_codes WHERE user_id = ?', [userId]);
    for (const code of codes) {
        await connection.execute('INSERT INTO totp_recovery_codes (user_id, code_hash) VALUES (?, ?)', [userId, hashRecoveryCode(code)]);
    }
    return codes;
}

/**
 * Kiểm tra bước hai: mã TOTP hoặc một mã dự phòng chưa dùng.
 * Phải gọi trong transaction sau khi đã khóa dòng users (FOR UPDATE) để hai yêu cầu đồng thời không dùng cùng một mã.
 */
export async function consumeSecondFactor(connection: PoolConnection, user: { id: string; totp_secret: string; totp_last_step: number | string | null }, code: string): Promise<boolean> {
    const step = verifyTotp(user.totp_secret, code, user.totp_last_step === null ? null : Number(user.totp_last_step));
    if (step !== null) {
        await connection.execute('UPDATE users SET totp_last_step = ? WHERE id = ?', [step, user.id]);
        return true;
    }
    const [used] = await connection.execute<ResultSetHeader>(
        'UPDATE totp_recovery_codes SET used_at = UTC_TIMESTAMP() WHERE user_id = ? AND code_hash = ? AND used_at IS NULL',
        [user.id, hashRecoveryCode(code)]);
    return used.affectedRows === 1;
}

/** Sau khi đúng mật khẩu: tạo phiên chờ bước hai, chưa cấp session đăng nhập. */
export async function startChallenge(userId: string): Promise<void> {
    assertNotThrottled(`2fa:${userId}`);
    const token = randomBytes(32).toString('hex');
    // Mỗi người chỉ có một phiên chờ để không nhân số lần thử mã bằng cách đăng nhập lại nhiều lần
    await database().execute('DELETE FROM login_challenges WHERE expires_at <= UTC_TIMESTAMP() OR user_id = ?', [userId]);
    await database().execute('INSERT INTO login_challenges (token_hash, user_id, expires_at) VALUES (?, ?, ?)',
        [hashToken(token), userId, new Date(Date.now() + CHALLENGE_SECONDS * 1000)]);
    (await cookies()).set(CHALLENGE_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: CHALLENGE_SECONDS, secure: cookieSecure() });
}

/** Bước hai đăng nhập: đúng mã thì xóa phiên chờ và tạo session; sai quá 5 lần thì hủy phiên chờ. */
export async function completeChallenge(code: string): Promise<void> {
    const jar = await cookies();
    const token = jar.get(CHALLENGE_COOKIE)?.value;
    const expired = new HttpError(401, 'Phiên xác thực đã hết hạn. Vui lòng đăng nhập lại.');
    if (!token || !/^[a-f0-9]{64}$/.test(token)) throw expired;
    const tokenHash = hashToken(token);
    const result = await atomic(async (connection) => {
        const [found] = await connection.execute<RowDataPacket[]>(`SELECT c.attempts, u.id, u.totp_secret, u.totp_last_step
            FROM login_challenges c JOIN users u ON u.id = c.user_id
            WHERE c.token_hash = ? AND c.expires_at > UTC_TIMESTAMP() AND u.totp_enabled = TRUE AND u.blocked = FALSE
            FOR UPDATE`, [tokenHash]);
        const user = found[0];
        if (!user) throw expired;
        assertNotThrottled(`2fa:${user.id}`);
        if (await consumeSecondFactor(connection, { id: user.id, totp_secret: user.totp_secret, totp_last_step: user.totp_last_step }, code)) {
            await connection.execute('DELETE FROM login_challenges WHERE token_hash = ?', [tokenHash]);
            return { userId: user.id as string, ok: true };
        }
        // Ghi nhận lần sai trong transaction (không throw để không bị rollback)
        if (user.attempts + 1 >= MAX_CHALLENGE_ATTEMPTS) await connection.execute('DELETE FROM login_challenges WHERE token_hash = ?', [tokenHash]);
        else await connection.execute('UPDATE login_challenges SET attempts = attempts + 1 WHERE token_hash = ?', [tokenHash]);
        return { userId: user.id as string, ok: false };
    });
    if (!result.ok) {
        recordFailure(`2fa:${result.userId}`);
        throw new HttpError(401, 'Mã xác thực không đúng.');
    }
    jar.delete(CHALLENGE_COOKIE);
    await createSession(result.userId);
}
