import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Isolated origin and account: exercise real built assets without changing application data.
const upstream = process.env.TRANSACTION_TEST_ORIGIN || 'http://localhost:3000';
const account = { userId: 'offline-test', wallets: [{ id: '1', name: 'Tiền mặt', balance: '100000' }],
    categories: [{ id: '1', name: 'Ăn uống', kind: 'expense' }] };
let revision = 'initial';
let missingAssets = false;
let failedAssets = 0;
const server = createServer(async (request, response) => {
    try {
        const path = new URL(request.url, upstream).pathname;
        if (path === '/disconnected') { request.socket.destroy(); return; }
        if (path === '/sw.js') {
            response.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' });
            response.end(await readFile(new URL('../public/sw.js', import.meta.url))); return;
        }
        if (path.startsWith('/api/')) {
            if (path === '/api/transactions') { response.writeHead(503); response.end(); return; }
            response.writeHead(200, { 'Content-Type': 'application/json' });
            response.end(JSON.stringify(path === '/api/auth/me' ? { user: { id: account.userId } }
                : path === '/api/offline' ? account : { wallets: account.wallets })); return;
        }
        if (missingAssets && path.startsWith('/_next/static/')) {
            failedAssets++;
            response.writeHead(404); response.end(); return;
        }
        const result = await fetch(new URL(request.url, upstream));
        response.writeHead(result.status, { 'Content-Type': result.headers.get('content-type') || 'text/plain',
            'Cache-Control': 'no-store', 'X-Test-Shell': revision });
        response.end(Buffer.from(await result.arrayBuffer()));
    } catch { response.writeHead(502); response.end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge' });
try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/offline`);
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.goto(`${origin}/`);
    await page.getByRole('heading', { name: 'Trang chủ', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ghi giao dịch', exact: true }).click();
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    await page.getByLabel('Số tiền', { exact: true }).fill('15000');
    await page.getByLabel('Ghi chú', { exact: true }).fill('Offline persistence test');
    await page.getByRole('button', { name: 'Lưu khoản chi', exact: true }).click();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ghi khoản khác', exact: true }).count(), 0);
    assert.equal(await page.getByText(/Không xóa dữ liệu trình duyệt/).count(), 0);
    await page.reload();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Về trang chủ', exact: true }).click();
    await page.getByRole('heading', { name: 'Trang chủ', exact: true }).waitFor();
    assert.equal(new URL(page.url()).pathname, '/');
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Trang chủ', exact: true }).waitFor();
    await page.getByRole('button', { name: 'Ghi giao dịch', exact: true }).click();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    await page.goBack();
    await page.getByRole('heading', { name: 'Trang chủ', exact: true }).waitFor();
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.getByRole('button', { name: 'Ghi giao dịch', exact: true }).click();
        await page.getByRole('button', { name: 'Về trang chủ', exact: true }).click();
        await page.getByRole('heading', { name: 'Trang chủ', exact: true }).waitFor();
    }
    console.log('Offline startup, transaction entry and durable reload passed.');

    // A subsequent online visit refreshes the offline document even if sw.js has not changed.
    revision = 'updated';
    await context.setOffline(false);
    await page.goto(`${origin}/offline`);
    await page.waitForFunction(async () => (await caches.match('/offline'))?.headers.get('X-Test-Shell') === 'updated');
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    missingAssets = true;
    await page.goto(`${origin}/disconnected`);
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    assert.ok(failedAssets > 0, 'Old asset 404s were exercised');
    assert.deepEqual(errors, [], 'Cached scripts hydrate despite removed server assets');
    console.log('Offline shell refresh and cached asset recovery after server 404s passed.');

    // A blocked IndexedDB request must end in a recoverable error, without deleting the queue.
    missingAssets = false;
    await page.addInitScript(() => {
        globalThis.originalDatabaseOpen = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function (name, ...args) {
            if (name === 'cnpm-offline') return {};
            return globalThis.originalDatabaseOpen.call(this, name, ...args);
        };
    });
    await page.goto(`${origin}/offline`);
    await page.getByRole('link', { name: 'Mở lại ứng dụng', exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Không mở được dữ liệu', exact: true }).waitFor({ timeout: 12000 });
    await page.evaluate(() => { IDBFactory.prototype.open = globalThis.originalDatabaseOpen; });
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    console.log('IndexedDB timeout, retry and pending transaction preservation passed.');
} finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}
