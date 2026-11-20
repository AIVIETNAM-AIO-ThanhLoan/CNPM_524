import assert from 'node:assert/strict';
import { chromium } from 'playwright';

// Use the actual runtime (including next dev), with isolated browser data and fixture APIs.
const browser = await chromium.launch({ channel: 'msedge' });
try {
    const context = await browser.newContext();
    await context.route('**/api/**', route => route.fulfill({ json: route.request().url().endsWith('/auth/me')
        ? { user: { id: 'hydration-test' } }
        : { userId: 'hydration-test', wallets: [{ id: '1', name: 'Tiền mặt', balance: '100000', currency: 'VND' }], categories: [{ id: '1', name: 'Ăn uống', kind: 'expense' }] } }));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${process.env.PWA_TEST_ORIGIN || 'http://localhost:3000'}/offline`);
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.waitForFunction(() => !!navigator.serviceWorker.controller);
    await context.setOffline(true);
    await page.reload();
    await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
    await page.getByLabel('Số tiền', { exact: true }).fill('15000');
    await page.getByRole('button', { name: 'Lưu khoản chi', exact: true }).click();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    await page.reload();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'outputs/offline-hydration-fixed.png', fullPage: true });
    console.log('PASS: actual runtime offline hydration, transaction entry and durable reload (fixture APIs; no DB writes).');
} finally { await browser.close(); }
