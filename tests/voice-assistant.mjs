import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.VOICE_TEST_ORIGIN || 'http://localhost:3000';
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
const wallets = [{ id: 'cash', name: 'Tiền mặt', currency: 'VND', balance: '0.00' }];
const categories = [{ id: 'food', name: 'Ăn uống', kind: 'expense' }, { id: 'salary', name: 'Lương', kind: 'income' }];
const posted = [];
const attempts = [];
let categoryReads = 0;
let categoryCreates = 0;
const pageErrors = [];
let rejectData = false;
let rejectSave = false;

async function prepare(page, supported = true, secure = true) {
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.addInitScript(({ supported, secure }) => {
        window.voiceScenario = 'normal';
        window.financeUpdates = 0;
        window.addEventListener('cnpm-finance-updated', () => window.financeUpdates++);
        class Recognition {
            start() {
                if (window.voiceScenario === 'start-error') throw new DOMException('Permission denied', 'NotAllowedError');
                window.voiceRecognition = this;
                this.onstart?.();
            }
            stop() { this.onend?.(); }
            abort() { this.aborted = true; this.onend?.(); }
        }
        Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: supported ? Recognition : undefined });
        Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, value: undefined });
        if (!secure) Object.defineProperty(window, 'isSecureContext', { configurable: true, value: false });
    }, { supported, secure });
    await page.route('**/api/**', async (route) => {
        const url = new URL(route.request().url());
        if (url.pathname === '/api/wallets') return route.fulfill({ status: rejectData ? 401 : 200, json: rejectData ? { error: 'Bạn cần đăng nhập.' } : { wallets } });
        if (url.pathname === '/api/categories') {
            if (route.request().method() === 'POST') {
                categoryCreates++;
                const payload = route.request().postDataJSON();
                categories.push({ id: 'created', name: payload.name, kind: payload.kind });
                return route.fulfill({ status: 201, json: { id: 'created' } });
            }
            categoryReads++;
            return route.fulfill({ json: { categories } });
        }
        if (url.pathname === '/api/transactions') {
            const payload = route.request().postDataJSON();
            attempts.push(payload);
            if (rejectSave) return route.fulfill({ status: 503, json: { error: 'Không lưu được giao dịch thử nghiệm.' } });
            posted.push(payload);
            return route.fulfill({ status: 201, json: { id: 'saved' } });
        }
        if (url.pathname === '/api/finance') return route.fulfill({ json: { income: 0, expense: 0, budget: 0, budgetAmount: 0, budgetSpent: 0, transactions: [], hasMore: false, breakdown: [], daily: [] } });
        if (url.pathname === '/api/budgets') return route.fulfill({ json: { budgets: [], totalAmount: '0.00' } });
        return route.fulfill({ json: { user: null, items: [], unread: 0 } });
    });
    await page.goto(origin);
}

try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
    await prepare(page);
    const open = () => page.getByRole('button', { name: 'Nhập giao dịch bằng giọng nói', exact: true }).click();
    const close = () => page.getByRole('button', { name: 'Đóng trợ lý giọng nói', exact: true }).click();
    const record = page.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true });
    // Giao dịch nhận diện được phải hiện thẻ xem lại; chỉ lưu khi bấm nút Lưu.
    const confirmSave = async (label = 'Lưu khoản chi') => {
        await page.getByRole('region', { name: 'Kiểm tra giao dịch' }).waitFor();
        await page.getByRole('button', { name: label, exact: true }).click();
    };
    const speak = (text) => page.evaluate((transcript) => {
        const recognition = window.voiceRecognition;
        const result = recognition.onresult;
        result?.({ results: [[{ transcript }]] });
        result?.({ results: [[{ transcript }]] });
        recognition.onend?.();
    }, text);
    await open();
    await record.click();
    assert.equal(await page.evaluate(() => window.voiceRecognition.lang), 'vi-VN');
    await page.getByRole('status').filter({ hasText: 'Đang nghe' }).waitFor();
    await page.evaluate(() => { window.voiceRecognition.onerror({ error: 'not-allowed' }); window.voiceRecognition.onend?.(); });
    await page.getByRole('alert').filter({ hasText: 'Micro đang bị chặn' }).waitFor();
    await close();

    await open();
    await page.evaluate(() => { window.voiceScenario = 'start-error'; });
    await record.click();
    await page.getByRole('alert').filter({ hasText: 'Micro đang bị chặn' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Dừng ghi âm' }).count(), 0);
    await page.evaluate(() => { window.voiceScenario = 'normal'; });
    await record.click();
    await speak('Ăn uống 50 nghìn');
    await page.getByRole('region', { name: 'Kiểm tra giao dịch' }).waitFor();
    assert.equal(posted.length, 0, 'Recognized speech must wait for review before saving');
    await page.getByRole('region', { name: 'Kiểm tra giao dịch' }).getByText('50.000đ').waitFor();
    await confirmSave();
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    await close();
    assert.equal(posted.length, 1, 'Duplicate results must not create duplicate transactions');
    assert.equal(posted[0].amount, '50000.00');
    assert.equal(posted[0].categoryId, 'food');
    assert.match(posted[0].bookedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.match(posted[0].requestKey, /^[0-9a-f-]{36}$/);
    assert.ok(await page.evaluate(() => window.financeUpdates > 0));

    await open();
    await record.click();
    await speak('Nhận được 1,5 triệu');
    await confirmSave('Lưu khoản thu');
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    await close();
    assert.equal(posted[1].kind, 'income');
    assert.equal(posted[1].categoryId, 'salary');
    assert.equal(posted[1].amount, '1500000.00');

    await open();
    await record.click();
    await speak('Ăn uống');
    await page.getByRole('alert').filter({ hasText: 'Không nhận diện được số tiền' }).waitFor();
    assert.equal(posted.length, 2);
    await close();

    await open();
    await record.click();
    await page.evaluate(() => { window.lateResult = window.voiceRecognition.onresult; });
    await close();
    assert.equal(await page.evaluate(() => window.voiceRecognition.aborted), true);
    await page.evaluate(() => window.lateResult({ results: [[{ transcript: 'Ăn uống 500 nghìn' }]] }));
    assert.equal(posted.length, 2, 'Closing the dialog must cancel subsequent recognition results');

    rejectData = true;
    await open();
    await page.getByRole('alert').filter({ hasText: 'Bạn cần đăng nhập' }).waitFor();
    assert.equal(await record.isDisabled(), true);
    rejectData = false;
    await page.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await record.click();
    await page.evaluate(() => { window.voiceRecognition.onerror({ error: 'network' }); window.voiceRecognition.onend?.(); });
    await page.getByRole('alert').filter({ hasText: 'Không kết nối được dịch vụ' }).waitFor();
    await close();

    rejectSave = true;
    await open();
    await record.click();
    await speak('Ăn uống 50 nghìn');
    await confirmSave();
    await page.getByRole('alert').filter({ hasText: 'Không lưu được giao dịch thử nghiệm' }).waitFor();
    assert.equal(posted.length, 2);
    rejectSave = false;
    const failedKey = attempts.at(-1).requestKey;
    // Lưu lỗi thì thẻ xem lại vẫn còn; bấm Lưu lần nữa dùng lại đúng mã yêu cầu.
    await confirmSave();
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    assert.equal(attempts.at(-1).requestKey, failedKey, 'Retry must reuse the request key');
    await close();

    // Nói lại: bỏ thẻ xem lại, không gửi gì.
    await open();
    const beforeDiscard = attempts.length;
    await record.click();
    await speak('Ăn uống 70 nghìn');
    await page.getByRole('button', { name: 'Nói lại', exact: true }).click();
    await record.waitFor();
    assert.equal(attempts.length, beforeDiscard, 'Discarding the review must not save');

    // Esc đóng hộp thoại mà không lưu (nguyên lý Ít gây bất ngờ).
    await record.click();
    await speak('Ăn uống 80 nghìn');
    await page.getByRole('region', { name: 'Kiểm tra giao dịch' }).waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: 'Trợ lý giọng nói' }).waitFor({ state: 'detached' });
    assert.equal(attempts.length, beforeDiscard, 'Escape must close without saving');

    // Opening again must see categories created elsewhere since the last open.
    categories.push({ id: 'travel', name: 'Du lịch', kind: 'expense' });
    const readsBefore = categoryReads;
    await open();
    await page.getByRole('textbox', { name: 'Nhập giao dịch bằng chữ' }).fill('Du lịch 200k');
    await page.getByRole('button', { name: 'Ghi', exact: true }).click();
    await confirmSave();
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    assert.ok(categoryReads > readsBefore);
    assert.equal(posted.at(-1).categoryId, 'travel');
    await close();

    await open();
    await page.getByRole('textbox', { name: 'Nhập giao dịch bằng chữ' }).fill('Ăn uống 1 triệu và 500 nghìn');
    await page.getByRole('button', { name: 'Ghi', exact: true }).click();
    await confirmSave();
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    assert.equal(posted.at(-1).amount, '1500000.00');
    await close();

    await open();
    const countBeforeNegative = posted.length;
    await page.getByRole('textbox', { name: 'Nhập giao dịch bằng chữ' }).fill('Ăn uống âm 50 nghìn');
    await page.getByRole('button', { name: 'Ghi', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'Không nhận diện được số tiền' }).waitFor();
    assert.equal(posted.length, countBeforeNegative);
    await close();

    // A failed save after creating a category must retry without creating it again.
    await open();
    await page.getByRole('textbox', { name: 'Nhập giao dịch bằng chữ' }).fill('Mua sách 200k');
    await page.getByRole('button', { name: 'Ghi', exact: true }).click();
    const create = page.getByRole('button', { name: 'Tạo & Lưu', exact: true });
    rejectSave = true;
    await create.click();
    await page.getByRole('alert').filter({ hasText: 'Không lưu được giao dịch thử nghiệm' }).waitFor();
    const categoryRetryKey = attempts.at(-1).requestKey;
    rejectSave = false;
    await create.click();
    await page.getByRole('status').filter({ hasText: 'Đã ghi' }).waitFor();
    assert.equal(categoryCreates, 1);
    assert.equal(attempts.at(-1).requestKey, categoryRetryKey);
    assert.equal(posted.at(-1).categoryId, 'created');
    await close();

    // Navigating away must also cancel the recognition and invalidate saved callbacks.
    await open();
    await record.click();
    await page.evaluate(() => { window.lateResult = window.voiceRecognition.onresult; });
    const beforeNavigation = posted.length;
    await page.locator('.bottom-nav a[href="/budgets"]').evaluate(link => link.click());
    await page.waitForURL('**/budgets');
    assert.equal(await page.evaluate(() => window.voiceRecognition.aborted), true);
    await page.evaluate(() => window.lateResult({ results: [[{ transcript: 'Ăn uống 500 nghìn' }]] }));
    assert.equal(posted.length, beforeNavigation);

    const unsupported = await browser.newPage({ serviceWorkers: 'block', reducedMotion: 'reduce' });
    await prepare(unsupported, false);
    await unsupported.getByRole('button', { name: 'Nhập giao dịch bằng giọng nói', exact: true }).click();
    await unsupported.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true }).click();
    await unsupported.getByRole('alert').filter({ hasText: 'không hỗ trợ nhận giọng nói' }).waitFor();
    assert.equal(await unsupported.getByRole('textbox', { name: 'Nhập giao dịch bằng chữ' }).isEnabled(), true);

    const insecure = await browser.newPage({ serviceWorkers: 'block', reducedMotion: 'reduce' });
    await prepare(insecure, true, false);
    await insecure.getByRole('button', { name: 'Nhập giao dịch bằng giọng nói', exact: true }).click();
    await insecure.getByRole('button', { name: 'Bắt đầu ghi âm', exact: true }).click();
    await insecure.getByRole('alert').filter({ hasText: 'HTTPS hoặc localhost' }).waitFor();
    assert.deepEqual(pageErrors, []);
    console.log('PASS: voice UI with simulated recognition: review before save, discard, Escape closes without saving, permissions, unsupported browser, insecure origin, service errors, retry, expense/income payloads, duplicate results, cancellation, save failure, idempotent retry, refreshed categories, connected amounts, negative rejection. Actual microphone/service availability is not tested.');
} finally { await browser.close(); }
