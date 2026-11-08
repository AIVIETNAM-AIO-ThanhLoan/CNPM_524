import 'server-only';
import { randomUUID } from 'node:crypto';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import { HttpError, text } from './http';

type ProviderSource = { id: string; name: string; kind: 'bank' | 'ewallet' };
const E_WALLETS = new Set(['ewallet:momo', 'ewallet:zalopay', 'ewallet:shopeepay', 'ewallet:viettel-money']);

export function providerSource(value: unknown): ProviderSource | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Nguồn chi không hợp lệ.');
    const source = value as Record<string, unknown>;
    const id = text(source.id, 'Mã nguồn chi', 100);
    const name = text(source.name, 'Tên nguồn chi', 100);
    if (source.kind === 'bank' && /^bank:\d{6}$/.test(id)) return { id, name, kind: 'bank' };
    if (source.kind === 'ewallet' && E_WALLETS.has(id)) return { id, name, kind: 'ewallet' };
    throw new HttpError(400, 'Ngân hàng hoặc ví điện tử không hợp lệ.');
}

// Called inside the ledger transaction after locking this user. A failed post rolls back provisioning too.
export async function resolveWalletSource(connection: PoolConnection, userId: string, source: ProviderSource): Promise<string> {
    const [linked] = await connection.execute<RowDataPacket[]>("SELECT id FROM accounts WHERE user_id = ? AND kind = 'wallet' AND source_key = ? FOR UPDATE", [userId, source.id]);
    if (linked.length) return linked[0].id;
    const [named] = await connection.execute<RowDataPacket[]>("SELECT id, source_key FROM accounts WHERE user_id = ? AND kind = 'wallet' AND name = ? FOR UPDATE", [userId, source.name]);
    if (named.length) {
        if (named[0].source_key && named[0].source_key !== source.id) throw new HttpError(409, 'Tên ví này đã được dùng cho một nguồn chi khác. Hãy đổi tên ví trước khi tiếp tục.');
        await connection.execute('UPDATE accounts SET source_key = ? WHERE user_id = ? AND id = ?', [source.id, userId, named[0].id]);
        return named[0].id;
    }
    const id = randomUUID();
    await connection.execute("INSERT INTO accounts (id, user_id, name, kind, source_key) VALUES (?, ?, ?, 'wallet', ?)", [id, userId, source.name, source.id]);
    return id;
}
