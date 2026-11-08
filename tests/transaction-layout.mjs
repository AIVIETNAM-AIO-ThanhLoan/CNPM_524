import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Exercise the shared transaction form with an isolated offline account; no database writes.
const browser = await chromium.launch({ channel: 'msedge' });
try {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    page.setDefaultTimeout(10000);
    await page.addInitScript(() => { navigator.serviceWorker.register = async () => ({}); });
    await page.route('**/api/**', route => route.abort());
    await page.goto(`${process.env.TRANSACTION_TEST_ORIGIN || 'http://localhost:3100'}/offline`);
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            const request = indexedDB.open('cnpm-offline', 1);
            request.onupgradeneeded = () => {
                request.result.createObjectStore('data');
                request.result.createObjectStore('outbox', { keyPath: 'requestKey' });
            };
            request.onerror = reject;
            request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('data', 'readwrite');
                tx.objectStore('data').put('layout-test', 'active');
                tx.objectStore('data').put({ userId: 'layout-test', wallets: [
                    { id: '1', name: 'Tiền mặt', balance: '5000000' },
                    { id: '2', name: 'Tài khoản ngân hàng', balance: '10000000' },
                ], categories: [
                    ...['Ăn uống', 'Đi lại', 'Tiền nhà', 'Mua sắm', 'Sức khỏe', 'Học tập', 'Chi phí sinh hoạt và gia đình'].map((name, i) => ({ id: String(i), name, kind: 'expense' })),
                    { id: 'salary', name: 'Lương', kind: 'income' },
                ] }, 'account:layout-test');
                tx.oncomplete = () => { db.close(); resolve(); };
                tx.onerror = reject;
            };
        });
    });
    await page.reload();
    await page.locator('.tx-form').waitFor();
    assert.equal(await page.locator('.pending-list').count(), 0, 'Empty outbox does not clutter entry');
    for (const [width, height] of [[320, 568], [390, 844], [430, 932], [844, 390], [1280, 900]]) {
        await page.setViewportSize({ width, height });
        await page.locator('.tx-type-switch').getByText('Chi', { exact: true }).click();
        const save = await page.locator('.tx-save').boundingBox();
        console.log(`${width}x${height}: save bottom ${Math.round(save.y + save.height)}px`);
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
        if (width < 768) {
            assert.ok(save.y + save.height <= 650, 'Compact form even with many categories');
            await page.getByLabel('Danh mục', { exact: true }).selectOption('6');
            assert.equal(await page.locator('select[name=categoryId]').inputValue(), '6');
            const voice = await page.locator('.voice-launcher').boundingBox();
            assert.ok(voice.y + voice.height <= 65, 'Voice entry stays in the header');
        } else {
            await page.getByLabel('Danh mục', { exact: true }).selectOption('1');
            assert.equal(await page.locator('select[name=categoryId]').inputValue(), '1');
        }
        await page.getByLabel('Số tiền', { exact: true }).fill('45000');
        await page.getByLabel('Ghi chú', { exact: true }).fill('Bữa trưa');
        await page.locator('.tx-save').scrollIntoViewIfNeeded();
        assert.ok(await page.locator('.tx-save').isEnabled());
        assert.ok(await page.locator('.tx-save').evaluate(el => {
            const rect = el.getBoundingClientRect();
            return el.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
        }), 'Save is not covered by navigation or microphone');
        await page.locator('.tx-type-switch').getByText('Thu', { exact: true }).click();
        assert.equal(await page.locator('select[name=categoryId]').inputValue(), 'salary');
        await page.getByRole('radio', { name: 'Thu', exact: true }).focus();
        await page.keyboard.press('ArrowLeft');
        assert.ok(await page.getByRole('radio', { name: 'Chi', exact: true }).isChecked());
        await page.locator('.tx-type-switch').getByText('Chuyển', { exact: true }).click();
        await page.locator('[name=targetId]').selectOption('2');
        assert.equal(await page.locator('[name=targetId]').inputValue(), '2');
        assert.equal(await page.getByLabel('Số tiền', { exact: true }).inputValue(), '45000');
        await page.locator('.tx-type-switch').getByText('Chi', { exact: true }).click();
        await page.evaluate(() => scrollTo(0, 0));
        await page.screenshot({ path: join(tmpdir(), `transaction-${width}.png`), fullPage: true });
    }
    await page.locator('.tx-save').click();
    await page.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    assert.ok(await page.getByText('Đã lưu trên thiết bị, chờ đồng bộ khi có mạng và đăng nhập đúng tài khoản.', { exact: true }).isVisible());
    const entries = await page.evaluate(() => new Promise((resolve, reject) => {
        const request = indexedDB.open('cnpm-offline', 1);
        request.onerror = reject;
        request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('outbox');
            const result = tx.objectStore('outbox').getAll();
            tx.oncomplete = () => { db.close(); resolve(result.result); };
            tx.onerror = reject;
        };
    }));
    assert.equal(entries.length, 1);
    assert.equal(entries[0].payload.amount, '45000');
    assert.equal(entries[0].payload.note, 'Bữa trưa');
    console.log('Modes, keyboard navigation, category selection, unobstructed save and offline queue passed.');

    // Use API fixtures to exercise confirmed saves through the shared form, without database writes.
    const posts = [];
    let rejectNext = false;
    let fixtureBalance = '4950000';
    await page.unroute('**/api/**');
    await page.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/auth/me') return route.fulfill({ json: { user: { id: 'layout-test' } } });
        if (path === '/api/wallets') return route.fulfill({ json: { wallets: [
            { id: '1', name: 'Tiền mặt', balance: fixtureBalance },
            { id: '2', name: 'Tài khoản ngân hàng', balance: '10000000' },
        ] } });
        if (path === '/api/transactions') {
            posts.push(route.request().postDataJSON());
            if (rejectNext) {
                rejectNext = false;
                return route.fulfill({ status: 400, json: { error: 'Giao dịch thử bị từ chối.' } });
            }
            return route.fulfill({ status: 201, json: { id: `saved-${posts.length}` } });
        }
        return route.abort();
    });
    await page.getByRole('button', { name: 'Thử đồng bộ', exact: true }).click();
    await page.locator('.pending-list').waitFor({ state: 'detached' });
    const entryUrl = page.url();
    for (const [mode, kind] of [['Chi', 'expense'], ['Chi', 'expense'], ['Thu', 'income'], ['Chuyển', 'transfer']]) {
        await page.locator('.tx-type-switch').getByText(mode, { exact: true }).click();
        await page.getByLabel('Ví', { exact: true }).selectOption('1');
        if (kind === 'transfer') await page.getByLabel('Ví nhận', { exact: true }).selectOption('2');
        else await page.getByLabel('Danh mục', { exact: true }).selectOption(kind === 'income' ? 'salary' : '6');
        await page.getByLabel('Ngày giao dịch', { exact: true }).fill('2026-11-05');
        await page.getByLabel('Số tiền', { exact: true }).fill('50000');
        await page.getByLabel('Ghi chú', { exact: true }).fill('Giao dịch đã ghi');
        const count = posts.length;
        await page.locator('.tx-save').click();
        await page.getByRole('status').filter({ hasText: 'Ghi giao dịch thành công.' }).waitFor();
        assert.equal(page.url(), entryUrl, 'Successful save keeps the current entry page');
        assert.equal(posts.length, count + 1);
        assert.equal(posts.at(-1).kind, kind);
        assert.equal(await page.getByLabel('Số tiền', { exact: true }).inputValue(), '', 'Clear saved amount to prevent accidental repeat');
        assert.equal(await page.getByLabel('Ghi chú', { exact: true }).inputValue(), '');
        assert.equal(await page.getByLabel('Ví', { exact: true }).inputValue(), '1');
        assert.equal(await page.getByLabel('Ngày giao dịch', { exact: true }).inputValue(), '2026-11-05');
        if (kind === 'transfer') assert.equal(await page.getByLabel('Ví nhận', { exact: true }).inputValue(), '2');
        else assert.equal(await page.getByLabel('Danh mục', { exact: true }).inputValue(), kind === 'income' ? 'salary' : '6');
        await page.waitForFunction(() => document.querySelector('select[name="walletId"]')?.textContent.includes('4.950.000'));
    }
    assert.equal(new Set(posts.map(post => post.requestKey)).size, posts.length, 'Each confirmed entry receives a new request key');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: join(tmpdir(), 'transaction-save-success.png'), fullPage: true });
    fixtureBalance = '4800000';
    await page.evaluate(() => window.dispatchEvent(new Event('cnpm-finance-updated')));
    await page.waitForFunction(() => document.querySelector('select[name="walletId"]')?.textContent.includes('4.800.000'));
    await page.locator('.tx-type-switch').getByText('Chi', { exact: true }).click();
    await page.getByLabel('Số tiền', { exact: true }).fill('30000');
    await page.getByLabel('Ghi chú', { exact: true }).fill('Giữ lại khi bị từ chối');
    rejectNext = true;
    await page.locator('.tx-save').click();
    await page.getByRole('alert').filter({ hasText: 'Giao dịch thử bị từ chối.' }).first().waitFor();
    assert.equal(await page.getByText('Ghi giao dịch thành công.', { exact: true }).count(), 0, 'A rejected save must not show success');
    assert.equal(page.url(), entryUrl);
    assert.equal(await page.getByLabel('Số tiền', { exact: true }).inputValue(), '30000');
    assert.equal(await page.getByLabel('Ghi chú', { exact: true }).inputValue(), 'Giữ lại khi bị từ chối');
    console.log('Confirmed expense/income/transfer saves stay on the form, clear saved fields, preserve selections, refresh balances and distinguish rejected submissions.');
} finally {
    await browser.close();
}
