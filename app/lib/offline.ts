'use client';
import { requestJson, type Wallet, type Category } from './client-api';
import { notifyFinanceUpdated } from './finance-updates';

export type PendingEntry = { requestKey: string; userId: string; payload: Record<string, unknown>; state: 'pending' | 'failed'; error: string; createdAt: string };
export type OfflineAccount = { userId: string; wallets: Wallet[]; categories: Category[] };
const CHANGED = 'cnpm:offline';
function open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('cnpm-offline', 1);
        request.onupgradeneeded = () => { request.result.createObjectStore('data'); request.result.createObjectStore('outbox', { keyPath: 'requestKey' }); };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Không mở được bộ nhớ ngoại tuyến. Chưa lưu giao dịch.'));
    });
}
async function operation<T>(store: string, mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await open();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(store, mode);
        const request = run(tx.objectStore(store));
        tx.oncomplete = () => { db.close(); resolve(request.result as T); };
        tx.onabort = tx.onerror = () => { db.close(); reject(new Error('Không lưu được dữ liệu trên thiết bị. Hãy giữ trang đang mở.')); };
    });
}
function changed() {
    window.dispatchEvent(new Event(CHANGED));
    try { localStorage.setItem(CHANGED, String(Date.now())); } catch { /* Same-tab updates still work. */ }
}
export function onOfflineChange(callback: () => void) {
    window.addEventListener(CHANGED, callback);
    const storage = (event: StorageEvent) => { if (event.key === CHANGED) callback(); };
    window.addEventListener('storage', storage);
    return () => { window.removeEventListener(CHANGED, callback); window.removeEventListener('storage', storage); };
}
export async function activeAccount(): Promise<OfflineAccount | null> {
    const id = await operation<string | null>('data', 'readonly', (store) => store.get('active'));
    return id ? await operation<OfflineAccount>('data', 'readonly', (store) => store.get(`account:${id}`)) || null : null;
}
export const accountRevision = () => { try { return localStorage.getItem('cnpm:logout') || ''; } catch { return ''; } };
export async function cacheAccount(account: OfflineAccount, activate = false, revision = accountRevision()) {
    await operation('data', 'readwrite', (store) => store.put(account, `account:${account.userId}`));
    if (activate) await operation('data', 'readwrite', (store) => revision === accountRevision() ? store.put(account.userId, 'active') : store.get('active'));
    changed();
}
export async function clearActiveAccount() {
    try { localStorage.setItem('cnpm:logout', crypto.randomUUID()); } catch { /* IndexedDB remains authoritative. */ }
    await operation('data', 'readwrite', (store) => store.delete('active'));
    changed();
}
export async function pendingEntries(userId: string) {
    return (await operation<PendingEntry[]>('outbox', 'readonly', (store) => store.getAll())).filter((item) => item.userId === userId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
export async function queueEntry(entry: PendingEntry) {
    await operation('outbox', 'readwrite', (store) => store.put(entry));
    changed();
}
export async function discardFailed(entry: PendingEntry) {
    if (entry.state !== 'failed') throw new Error('Chỉ xóa khoản bị từ chối. Khoản chờ có thể đã được máy chủ nhận.');
    await operation('outbox', 'readwrite', (store) => store.delete(entry.requestKey));
    changed();
}
let syncing = false;
export async function synchronize(userId: string) {
    const sync = async () => {
        if (syncing || !navigator.onLine) return;
        syncing = true;
        try {
            const { user } = await requestJson<{ user: { id: string } | null }>('/api/auth/me');
            if (user?.id !== userId) return;
            for (const entry of await pendingEntries(userId)) {
                if (entry.state === 'failed') continue;
                let response: Response;
                try {
                    response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...entry.payload, requestKey: entry.requestKey, expectedUserId: userId }), signal: AbortSignal.timeout(15000) });
                } catch { break; }
                if (response.ok) {
                    await operation('outbox', 'readwrite', (store) => store.delete(entry.requestKey));
                    notifyFinanceUpdated(); changed();
                } else {
                    if (response.status === 401 || response.status >= 500) break;
                    const data = await response.json().catch(() => ({}));
                    if (response.status === 409 && data.accountMismatch) break;
                    await queueEntry({ ...entry, state: 'failed', error: data.error || 'Máy chủ từ chối giao dịch. Hãy kiểm tra lại.' });
                }
            }
        } finally { syncing = false; }
    };
    if (navigator.locks) await navigator.locks.request('cnpm-outbox', sync);
    else await sync();
}
