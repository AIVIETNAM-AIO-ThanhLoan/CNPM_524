import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';

// Run against a production server; API fixtures never write to the application database.
const origin = process.env.PWA_TEST_ORIGIN || 'http://127.0.0.1:3139';
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const account = { userId: 'offline-test-user', wallets: [{ id: 'cash', name: 'Tiền mặt', currency: 'VND', balance: '500000.00' }],
    categories: [{ id: 'food', name: 'Ăn uống', kind: 'expense' }, { id: 'salary', name: 'Lương', kind: 'income' }] };
const posted = [];
const errors = [];
let signedIn = true;
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' });
await context.route('**/api/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    if (pathname === '/api/auth/me') return route.fulfill({ json: { user: signedIn ? { id: account.userId } : null } });
    if (pathname === '/api/offline') return route.fulfill({ json: account });
    if (pathname === '/api/transactions') {
        posted.push(route.request().postDataJSON());
        return route.fulfill({ status: 201, json: { success: true } });
    }
    return route.fulfill({ status: 503, json: { error: 'Unavailable test fixture' } });
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
page.setDefaultTimeout(15000);
const entries = () => page.evaluate(async () => {
    const db = await new Promise((resolve, reject) => { const r = indexedDB.open('cnpm-offline', 1); r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
    const items = await new Promise(resolve => { const r = db.transaction('outbox').objectStore('outbox').getAll(); r.onsuccess = () => resolve(r.result); });
    db.close(); return items;
});
async function until(predicate) {
    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
        if (await predicate()) return;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Timed out waiting for offline queue state');
}
try {
    await mkdir('outputs', { recursive: true });
    await page.goto(`${origin}/offline`);
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await page.locator('input[name=note]').fill('Draft before disconnect');
    await context.setOffline(true);
    await page.screenshot({ path: process.env.PWA_BASELINE ? 'outputs/pwa-offline-before.png' : 'outputs/pwa-offline-mobile.png', fullPage: true });
    if (process.env.PWA_BASELINE) {
        console.log('Baseline screenshot captured.');
    } else {
        await page.getByRole('button', { name: 'Lưu trên thiết bị', exact: true }).waitFor();
        assert.equal(await page.locator('input[name=note]').inputValue(), 'Draft before disconnect');
        assert.equal(await page.getByRole('button', { name: 'Nhập giao dịch bằng giọng nói', exact: true }).count(), 0);
        assert.equal(await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).count(), 0);
        assert.equal(await page.getByText('Thêm ví (cần mạng)', { exact: true }).count(), 0);
        assert.equal(await page.getByRole('navigation', { name: 'Điều hướng chính' }).count(), 0);
        await page.locator('input[name=amount]').fill('12345');
        await page.locator('input[name=note]').fill('Khoản chi ngoại tuyến');
        await page.getByRole('button', { name: 'Lưu trên thiết bị', exact: true }).click();
        await page.getByText('Đã lưu trên thiết bị, chờ đồng bộ khi có mạng và đăng nhập đúng tài khoản.', { exact: true }).waitFor();
        const first = (await entries())[0];
        assert.equal(first.userId, account.userId);
        await page.getByRole('button', { name: 'Lưu trên thiết bị', exact: true }).click();
        assert.equal((await entries()).length, 1);
        assert.equal(await page.getByRole('button', { name: 'Thử đồng bộ', exact: true }).isDisabled(), true);

        // Exercise a never-visited URL as well as reload; both must hydrate from the cached shell.
        await page.goto(`${origin}/history`);
        await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
        await page.getByText(/Khoản chi ngoại tuyến ·/).waitFor();
        assert.equal(await page.getByRole('link', { name: 'Ghi giao dịch ngoại tuyến', exact: true }).isVisible(), false);
        await page.reload();
        await page.getByText(/Khoản chi ngoại tuyến ·/).waitFor();
        assert.equal((await entries())[0].requestKey, first.requestKey);
        for (const width of [320, 390, 768, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}px`);
            const sizes = await page.locator('input, select, button').evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height > 0).map(el => ({
                font: Number.parseFloat(getComputedStyle(el).fontSize), height: el.getBoundingClientRect().height,
            })));
            assert.ok(sizes.every(size => size.font >= 16 && size.height >= 44), `Small controls at ${width}px`);
            await page.screenshot({ path: `outputs/pwa-offline-${width}.png`, fullPage: true });
        }
        await context.setOffline(false);
        await until(async () => posted.length === 1 && (await entries()).length === 0);
        assert.equal(posted[0].requestKey, first.requestKey);
        assert.equal(posted[0].expectedUserId, account.userId);
        await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).isVisible(), true);
        assert.equal(await page.getByRole('navigation', { name: 'Điều hướng chính' }).isVisible(), true);

        // Without an active cached account, offer online sign-in only after reconnection.
        signedIn = false;
        await page.evaluate(async () => {
            const db = await new Promise(resolve => { const r = indexedDB.open('cnpm-offline', 1); r.onsuccess = () => resolve(r.result); });
            await new Promise(resolve => { const tx = db.transaction('data', 'readwrite'); tx.objectStore('data').delete('active'); tx.oncomplete = resolve; });
            db.close();
        });
        await context.setOffline(true);
        await page.goto(`${origin}/offline`);
        await page.getByRole('heading', { name: 'Chưa có dữ liệu ngoại tuyến', exact: true }).waitFor();
        assert.equal(await page.getByRole('link', { name: 'Đăng nhập', exact: true }).count(), 0);
        await page.setViewportSize({ width: 390, height: 844 });
        await page.screenshot({ path: 'outputs/pwa-offline-empty.png', fullPage: true });
        await context.setOffline(false);
        await page.getByRole('link', { name: 'Đăng nhập', exact: true }).waitFor();
        assert.deepEqual(errors, []);
        console.log('PASS: offline controls, durable queue, duplicate prevention, navigation/reload, reconnect, empty state, and 320/390/768/1280px layouts (HTTP fixtures; no live DB writes).');
    }
} finally { await browser.close(); }
