import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import mysql from 'mysql2/promise';
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const suffix = randomBytes(6).toString('hex');
const dbName = `cnpm_test_${suffix}`;
const dbUser = `cnpm_t_${suffix}`;
const distDir = `.next-test-${suffix}`;
const testTsconfig = `.tsconfig-test-${suffix}.json`;
const socket = createServer();
await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise((resolve) => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, NODE_ENV: 'development', DB_NAME: dbName, DB_USER: dbUser,
    DB_PASSWORD: randomBytes(32).toString('hex'), APP_ORIGIN: origin, COOKIE_SECURE: 'false', CNPM_TEST_BUILD_DIR: distDir,
    CNPM_TEST_TSCONFIG: testTsconfig, NEXT_TELEMETRY_DISABLED: '1' };
if (!env.DB_SETUP_USER || env.DB_SETUP_PASSWORD === undefined) throw new Error('Configure DB_SETUP_USER and DB_SETUP_PASSWORD first.');
const admin = await mysql.createConnection({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306),
    user: env.DB_SETUP_USER, password: env.DB_SETUP_PASSWORD, dateStrings: true });
let server;
let serverLog = '';
let checks = 0;
function check(condition, message) { assert.ok(condition, message); checks++; }

function setup() {
    const result = spawnSync(process.execPath, ['scripts/setup-database.mjs'], { env, encoding: 'utf8', timeout: 30000 });
    assert.equal(result.status, 0, result.stderr);
}

async function api(route, { body, cookie, status = 200, requestOrigin = origin, raw } = {}) {
    const response = await fetch(`${origin}${route}`, { method: body !== undefined || raw !== undefined ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json', Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) },
        body: raw !== undefined ? raw : body !== undefined ? JSON.stringify(body) : undefined });
    const json = await response.json();
    assert.equal(response.status, status, `${route}: ${JSON.stringify(json)}`);
    checks++;
    return { json, cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

try {
    const typescript = JSON.parse(await readFile('tsconfig.json', 'utf8'));
    typescript.include = typescript.include.filter((item) => !item.startsWith('.next-test-'));
    typescript.include.push(`${distDir}/types/**/*.ts`, `${distDir}/dev/types/**/*.ts`);
    await writeFile(testTsconfig, JSON.stringify(typescript, null, 2));
    setup();
    await admin.changeUser({ database: dbName });
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
        { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const capture = (chunk) => { serverLog = (serverLog + chunk.toString()).slice(-6000); };
    server.stdout.on('data', capture); server.stderr.on('data', capture);
    let ready = false;
    for (let attempt = 0; attempt < 120; attempt++) {
        if (server.exitCode !== null) throw new Error(`Test server exited: ${serverLog}`);
        try {
            const response = await fetch(`${origin}/api/auth/me`, { signal: AbortSignal.timeout(1500) });
            if (response.status === 200) { ready = true; break; }
        } catch { /* startup */ }
        await new Promise((resolve) => setTimeout(resolve, 500));
    }
    check(ready, 'Test server started');
    await api('/api/wallets', { status: 401 });
    await api('/api/auth/register', { body: { name: 'No CSRF' }, status: 403, requestOrigin: 'https://other.example' });
    await api('/api/auth/register', { raw: '{', status: 400 });
    await api('/api/auth/register', { body: { name: 'Short', account: 'short@example.com', password: 'short' }, status: 400 });
    const password = 'Integration-Only-Password';
    const a = { name: 'Người dùng A', account: 'a@example.com', password, role: 'admin' };
    const b = { name: 'Người dùng B', account: '0901234567', password };
    await api('/api/auth/register', { body: a, status: 201 });
    await api('/api/auth/register', { body: b, status: 201 });
    await api('/api/auth/register', { body: { ...a, account: 'A@EXAMPLE.COM' }, status: 409 });
    await api('/api/auth/login', { body: { account: a.account, password: 'Incorrect-Password' }, status: 401 });
    const { cookie } = await api('/api/auth/login', { body: a });
    check(cookie?.startsWith('cnpm_session='), 'Session cookie exists');
    const me = (await api('/api/auth/me', { cookie })).json.user;
    check(me.role === 'user', 'Registration cannot set admin role');
    check(me.name === a.name, 'UTF-8 name preserved');
    const [stored] = await admin.execute('SELECT password_hash FROM users WHERE id = ?', [me.id]);
    check(stored[0].password_hash.startsWith('scrypt:') && stored[0].password_hash !== password, 'Password is hashed');
    const [sessions] = await admin.execute('SELECT token_hash FROM sessions WHERE user_id = ?', [me.id]);
    check(sessions[0].token_hash !== cookie.split('=')[1], 'Only session token hash is stored');
    let wallets = (await api('/api/wallets', { cookie })).json.wallets;
    let categories = (await api('/api/categories', { cookie })).json.categories;
    check(wallets.length === 2 && categories.length === 6, 'Default wallets and categories seeded');
    check(wallets.every((w) => Number(w.balance) === 0), 'New wallets start at zero');
    const walletId = wallets[0].id;
    const targetId = wallets[1].id;
    const income = categories.find((c) => c.kind === 'income').id;
    const expense = categories.find((c) => c.kind === 'expense').id;
    const base = { walletId, amount: '1000.10', kind: 'income', categoryId: income, bookedOn: '2026-10-14', note: 'Lương tháng 10', requestKey: randomUUID() };
    await api('/api/transactions', { cookie, body: base, status: 201 });
    await api('/api/transactions', { cookie, body: base, status: 409 });
    await api('/api/transactions', { cookie, body: { ...base, kind: 'expense', categoryId: expense, amount: '100.05', requestKey: randomUUID() }, status: 201 });
    await api('/api/transactions', { cookie, body: { ...base, kind: 'transfer', targetId, amount: '200.02', requestKey: randomUUID() }, status: 201 });
    const financeUrl = '/api/finance?start=2026-10-01&end=2026-10-31';
    let report = (await api(financeUrl, { cookie })).json;
    check(report.income === 1000.1 && report.expense === 100.05, 'Transfer excluded from income and expense');
    check(report.transactions.length === 3, 'Each transfer appears once in history');
    check(report.breakdown.length === 2, 'Reports aggregate categories from database');
    wallets = (await api('/api/wallets', { cookie })).json.wallets;
    check(wallets.find((w) => w.id === walletId).balance === '700.03', 'Source balance is exact');
    check(wallets.find((w) => w.id === targetId).balance === '200.02', 'Destination balance is exact');
    for (const invalid of ['0', '-1', '1.001', '1e3', '1000000000000', 1]) {
        await api('/api/transactions', { cookie, body: { ...base, amount: invalid, requestKey: randomUUID() }, status: 400 });
    }
    await api('/api/transactions', { cookie, body: { ...base, bookedOn: '2026-02-30', requestKey: randomUUID() }, status: 400 });
    await api('/api/transactions', { cookie, body: { ...base, kind: 'expense', requestKey: randomUUID() }, status: 400 });
    await api('/api/transactions', { cookie, body: { ...base, kind: 'transfer', targetId: walletId, requestKey: randomUUID() }, status: 400 });
    await api('/api/transactions', { cookie, body: base, status: 403, requestOrigin: 'https://other.example' });
    await api('/api/finance?start=2026-10-31&end=2026-10-01', { cookie, status: 400 });
    check((await api(`${financeUrl}&q=${encodeURIComponent('Lương')}`, { cookie })).json.transactions.length === 3, 'Search finds matching notes');
    check((await api(`${financeUrl}&q=${encodeURIComponent("' OR 1=1 --")}`, { cookie })).json.transactions.length === 0, 'Search treats SQL as text');
    check((await api(`${financeUrl}&q=%25`, { cookie })).json.transactions.length === 0, 'Search escapes wildcard');
    const { cookie: cookieB } = await api('/api/auth/login', { body: b });
    for (const route of ['/profile', '/transactions/new']) {
        const response = await fetch(`${origin}${route}`, { headers: { Cookie: cookieB } });
        check(response.status === 200, `${route} renders for authenticated user`);
        const markup = await response.text();
        check(markup.includes(route === '/profile' ? b.name : 'Lưu giao dịch'), `${route} displays database-backed content`);
    }
    const walletsB = (await api('/api/wallets', { cookie: cookieB })).json.wallets;
    check((await api(financeUrl, { cookie: cookieB })).json.transactions.length === 0, 'Other user cannot read transactions');
    await api('/api/transactions', { cookie: cookieB, body: { ...base, requestKey: randomUUID() }, status: 404 });
    await api('/api/transactions', { cookie, body: { ...base, kind: 'transfer', targetId: walletsB[0].id, requestKey: randomUUID() }, status: 404 });
    await api('/api/transactions', { cookie: cookieB, body: { ...base, walletId: walletsB[0].id, requestKey: randomUUID() }, status: 400 });
    await api('/api/wallets', { cookie, body: { name: 'Ví tiết kiệm' }, status: 201 });
    await api('/api/categories', { cookie, body: { name: 'Học tập', kind: 'expense' }, status: 201 });
    await api('/api/categories', { cookie, body: { name: 'Học tập', kind: 'expense' }, status: 409 });
    const [orphans] = await admin.execute("SELECT COUNT(*) AS n FROM accounts WHERE name = 'Danh mục expense: Học tập' AND user_id = ?", [me.id]);
    check(orphans[0].n === 1, 'Duplicate category rolls back backing account');
    await Promise.all(Array.from({ length: 6 }, () => api('/api/transactions', { cookie, body: { ...base, amount: '0.01', requestKey: randomUUID() }, status: 201 })));
    const [ledger] = await admin.query('SELECT transaction_id, SUM(amount) AS balance, COUNT(*) AS n FROM transaction_entries GROUP BY transaction_id');
    check(ledger.every((row) => Number(row.balance) === 0 && row.n === 2), 'Every transaction has two balanced postings');
    // Force the second posting to fail and verify the header and first posting roll back.
    await admin.query(`CREATE TRIGGER test_fail_entry BEFORE INSERT ON transaction_entries FOR EACH ROW
        BEGIN IF NEW.account_id = '${targetId}' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'forced test failure'; END IF; END`);
    const failedKey = randomUUID();
    await api('/api/transactions', { cookie, body: { ...base, kind: 'transfer', targetId, requestKey: failedKey }, status: 503 });
    await admin.query('DROP TRIGGER test_fail_entry');
    const [failed] = await admin.execute('SELECT COUNT(*) AS n FROM transactions WHERE request_key = ?', [failedKey]);
    check(failed[0].n === 0, 'Failed posting rolls back entire transaction');
    const budgetMonth = '2026-10';
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: budgetMonth, amount: '500000' }, status: 201 });
    await api('/api/budgets', { cookie, body: { categoryId: income, month: budgetMonth, amount: '500000' }, status: 400 });
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: '2026-13', amount: '500000' }, status: 400 });
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: budgetMonth, amount: '0' }, status: 400 });
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: budgetMonth, amount: '750000' }, status: 201 });
    const { json: budgetList } = await api(`/api/budgets?month=${budgetMonth}`, { cookie });
    check(budgetList.budgets.length === 1 && Number(budgetList.budgets[0].amount) === 750000, 'Budget upsert replaces the amount for the month');
    check(budgetList.totalAmount === '750000.00', 'Budget total comes from saved category limits');
    await api('/api/budgets?month=bad', { cookie, status: 400 });
    await api('/api/budgets?month=0000-01', { cookie, status: 400 });
    await api('/api/budgets', { cookie: cookieB, body: { categoryId: expense, month: budgetMonth, amount: '1' }, status: 400 });
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: budgetMonth, amount: '1' }, requestOrigin: 'https://other.example', status: 403 });
    const { json: budgetOther } = await api(`/api/budgets?month=${budgetMonth}`, { cookie: cookieB });
    check(budgetOther.budgets.length === 0, 'Budgets are isolated per user');
    check(budgetOther.totalAmount === '0.00', 'Empty budget total is zero');
    const secondExpense = categories.find((c) => c.kind === 'expense' && c.id !== expense).id;
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: '2027-01', amount: '0.10' }, status: 201 });
    await api('/api/budgets', { cookie, body: { categoryId: secondExpense, month: '2027-01', amount: '0.20' }, status: 201 });
    check((await api('/api/budgets?month=2027-01', { cookie })).json.totalAmount === '0.30', 'Sum of decimal budgets is exact');
    await api('/api/budgets', { cookie, body: { categoryId: expense, month: '2027-01', amount: '0.30' }, status: 201 });
    check((await api('/api/budgets?month=2027-01', { cookie })).json.totalAmount === '0.50', 'Editing a budget replaces the old amount in the total');
    check((await api(`/api/budgets?month=${budgetMonth}`, { cookie })).json.totalAmount === '750000.00', 'Budget months stay separate');
    await api('/api/goals', { cookie, body: { name: 'Mua xe', targetAmount: '20000000', dueOn: '2027-06-30' }, status: 201 });
    await api('/api/goals', { cookie, body: { name: 'Quỹ dự phòng', targetAmount: '0' }, status: 400 });
    const { json: goalList } = await api('/api/goals', { cookie });
    check(goalList.goals.some((g) => g.name === 'Mua xe' && Number(g.targetAmount) === 20000000), 'Goals are saved and listed');
    const limitAccount = 'limit@example.com';
    await api('/api/auth/register', { body: { name: 'Limit', account: limitAccount, password }, status: 201 });
    for (let i = 0; i < 14; i++) await api('/api/auth/login', { body: { account: limitAccount, password: 'wrong-password' }, status: 401 });
    await api('/api/auth/login', { body: { account: limitAccount, password }, status: 200 });
    for (let i = 0; i < 14; i++) await api('/api/auth/login', { body: { account: limitAccount, password: 'wrong-password' }, status: 401 });
    await api('/api/auth/login', { body: { account: limitAccount, password: 'wrong-password' }, status: 401 });
    await api('/api/auth/login', { body: { account: limitAccount, password }, status: 429 });
    check(true, 'Login limiter counts only failures and locks after 15 failures');
    setup();
    const [countAfterSetup] = await admin.query('SELECT COUNT(*) AS n FROM transactions');
    check(countAfterSetup[0].n === 9, 'Setup rerun preserves transactions');
    await admin.execute('UPDATE users SET blocked = TRUE WHERE id = ?', [me.id]);
    await api('/api/wallets', { cookie, status: 401 });
    await admin.execute('UPDATE users SET blocked = FALSE WHERE id = ?', [me.id]);
    await api('/api/wallets', { cookie, status: 401 });
    await api('/api/auth/logout', { cookie, body: {} });
    await api('/api/wallets', { cookie, status: 401 });
    const { cookie: newCookie } = await api('/api/auth/login', { body: a });
    await admin.execute('UPDATE sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 DAY WHERE user_id = ?', [me.id]);
    await api('/api/wallets', { cookie: newCookie, status: 401 });
    for (const route of ['/', '/login', '/register', '/history', '/reports', '/profile', '/chat', '/notifications', '/budgets']) {
        const response = await fetch(`${origin}${route}`);
        check(response.status === 200, `${route} renders`);
    }
    const privatePage = await fetch(`${origin}/transactions/new`, { redirect: 'manual' });
    check(privatePage.status === 307 && privatePage.headers.get('location') === '/login', 'Transaction form requires login');
    const adminPage = await fetch(`${origin}/admin`, { headers: { Cookie: cookieB }, redirect: 'manual' });
    check(adminPage.status === 307 && adminPage.headers.get('location') === '/profile', 'Admin page rejects ordinary users');
    if (process.argv.includes('--browser')) {
        const { chromium } = await import('playwright');
        const browser = await chromium.launch({ headless: true,
            ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
        try {
            const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
            const pageErrors = [];
            page.on('pageerror', (error) => pageErrors.push(error.message));
            await page.goto(`${origin}/register`);
            await page.getByPlaceholder('Họ và tên').fill('Kiểm thử trình duyệt');
            await page.getByPlaceholder('Số điện thoại hoặc email').fill('browser@example.com');
            await page.getByPlaceholder('Mật khẩu', { exact: true }).fill(password);
            await page.getByPlaceholder('Xác nhận mật khẩu').fill(password);
            await page.getByRole('button', { name: 'Đăng ký', exact: true }).click();
            await page.waitForURL('**/login');
            await page.getByPlaceholder('Số điện thoại hoặc email').fill('browser@example.com');
            await page.getByPlaceholder('Mật khẩu', { exact: true }).fill(password);
            await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
            await page.waitForURL('**/profile');
            await page.getByRole('heading', { name: 'Ví của tôi', exact: true }).waitFor();
            checks++;
            const record = async (kind, amount) => {
                await page.goto(`${origin}/transactions/new`);
                await page.locator('select').first().selectOption(kind);
                const cash = await page.locator('select[name=walletId] option').filter({ hasText: 'Tiền mặt' }).getAttribute('value');
                await page.locator('select[name=walletId]').selectOption(cash);
                if (kind === 'transfer') {
                    const bank = await page.locator('select[name=targetId] option').filter({ hasText: 'Ngân hàng' }).getAttribute('value');
                    await page.locator('select[name=targetId]').selectOption(bank);
                }
                await page.locator('input[name=amount]').fill(amount);
                await page.locator('input[name=note]').fill(`Browser ${kind}`);
                await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).click();
                await page.waitForURL('**/history');
                await page.getByText(`Browser ${kind}`, { exact: true }).waitFor();
                checks++;
            };
            await record('income', '1000000');
            await record('expense', '50000');
            await record('transfer', '200000');
            await page.goto(`${origin}/profile`);
            await page.getByText('750.000đ', { exact: true }).waitFor();
            await page.getByText('200.000đ', { exact: true }).waitFor();
            checks += 2;
            await page.goto(`${origin}/reports`);
            await page.getByText('-50.000đ', { exact: true }).waitFor();
            await page.getByText('+1.000.000đ', { exact: true }).waitFor();
            checks += 2;
            await page.goto(origin);
            await page.getByText('1.000.000đ', { exact: true }).waitFor();
            await page.getByText('50.000đ', { exact: true }).waitFor();
            checks += 2;
            const overflows = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
            check(!overflows, 'Home layout fits mobile width');
            await page.getByRole('link', { name: 'Trợ lý AI', exact: true }).click();
            await page.waitForURL('**/chat');
            await page.getByRole('heading', { name: 'Trợ lý AI - Ting Ting' }).waitFor();
            await page.getByRole('button', { name: 'Gợi ý cách tiết kiệm', exact: true }).click();
            await page.getByText('Tính năng trợ lý AI đang được phát triển. Hiện mình chỉ trả lời mẫu.', { exact: true }).waitFor();
            checks++;
            await page.goto(origin);
            await page.getByRole('link', { name: 'Thông báo', exact: true }).click();
            await page.waitForURL('**/notifications');
            await page.getByRole('button', { name: 'Đọc tất cả', exact: true }).click();
            check(await page.getByLabel('Chưa đọc', { exact: true }).count() === 0, 'Upstream notifications interaction preserved');
            await page.getByRole('link', { name: 'Quay lại', exact: true }).click();
            await page.getByRole('link', { name: 'Ngân sách', exact: true }).click();
            await page.waitForURL('**/budgets');
            const totalIs = async (value) => {
                await page.waitForFunction((expected) => document.querySelector('[data-testid=budget-total]')?.textContent === expected, value);
                checks++;
            };
            await totalIs('0đ');
            const expenseOptions = (await (await page.request.get(`${origin}/api/categories`)).json()).categories.filter((c) => c.kind === 'expense');
            check(await page.getByRole('article').count() === expenseOptions.length, 'Budget page uses existing expense categories');
            check(await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).count() === 0, 'Category creation belongs to the transaction form');
            check(await page.getByRole('link', { name: 'Ngân sách', exact: true }).getAttribute('aria-current') === 'page', 'Budget navigation is active');
            const setBudget = async (name, value) => {
                const card = page.getByRole('article', { name, exact: true });
                await card.getByRole('button', { name: /^(Đặt|Sửa) ngân sách$/ }).click();
                await card.getByRole('spinbutton', { name: `Ngân sách cho ${name}`, exact: true }).fill(value);
                await card.getByRole('button', { name: 'Lưu ngân sách', exact: true }).click();
                await page.getByRole('status').filter({ hasText: `Đã lưu ngân sách cho ${name}.` }).waitFor();
            };
            await setBudget('Ăn uống', '800000');
            await totalIs('800.000đ');
            await setBudget('Đi lại', '200000');
            await totalIs('1.000.000đ');
            await setBudget('Ăn uống', '900000');
            await totalIs('1.100.000đ');
            await page.getByRole('button', { name: 'Tháng sau', exact: true }).click();
            await totalIs('0đ');
            await page.getByRole('button', { name: 'Tháng trước', exact: true }).click();
            await totalIs('1.100.000đ');
            await page.reload();
            await totalIs('1.100.000đ');
            const addCategory = async (name) => {
                await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
                const dialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
                await dialog.getByRole('textbox', { name: 'Tên danh mục', exact: true }).fill(name);
                await dialog.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
                await dialog.waitFor({ state: 'hidden' });
            };
            // The Next.js dev indicator can cover the first mobile nav item; activate the link by keyboard.
            await page.getByRole('link', { name: 'Trang chủ', exact: true }).press('Enter');
            await page.getByRole('link', { name: 'Ghi giao dịch', exact: true }).click();
            await page.waitForURL('**/transactions/new');
            await addCategory('Du lịch');
            await page.getByRole('button', { name: 'Du lịch', exact: true }).waitFor();
            await page.getByRole('link', { name: 'Ngân sách', exact: true }).click();
            await page.getByRole('article', { name: 'Du lịch', exact: true }).waitFor();
            await totalIs('1.100.000đ');
            await setBudget('Du lịch', '300000');
            await totalIs('1.400.000đ');
            await page.getByRole('link', { name: 'Trang chủ', exact: true }).press('Enter');
            await page.getByRole('link', { name: 'Ghi giao dịch', exact: true }).click();
            await page.waitForURL('**/transactions/new');
            await page.getByRole('button', { name: 'Thêm danh mục', exact: true }).click();
            const duplicateDialog = page.getByRole('dialog', { name: 'Thêm danh mục', exact: true });
            await duplicateDialog.getByRole('textbox', { name: 'Tên danh mục', exact: true }).fill('Du lịch');
            await duplicateDialog.getByRole('button', { name: 'Tạo danh mục', exact: true }).click();
            await duplicateDialog.getByRole('alert').waitFor();
            check(await duplicateDialog.isVisible(), 'Duplicate category error keeps the form open');
            await duplicateDialog.getByRole('button', { name: 'Hủy', exact: true }).click();
            await page.getByRole('button', { name: 'Du lịch', exact: true }).waitFor();
            await addCategory('Sức khỏe');
            check(await page.getByRole('button', { name: 'Sức khỏe', exact: true }).getAttribute('aria-pressed') === 'true', 'New transaction category is selected without submitting a transaction');
            check(new URL(page.url()).pathname === '/transactions/new', 'Category dialog does not submit the surrounding transaction form');
            await page.screenshot({ path: path.join(tmpdir(), 'cnpm-transaction-categories.png'), fullPage: true });
            await page.getByRole('link', { name: 'Ngân sách', exact: true }).click();
            await page.getByRole('article', { name: 'Sức khỏe', exact: true }).waitFor();
            await setBudget('Sức khỏe', '150000');
            await totalIs('1.550.000đ');
            const healthCard = page.getByRole('article', { name: 'Sức khỏe', exact: true });
            await healthCard.getByRole('button', { name: 'Sửa ngân sách', exact: true }).click();
            await healthCard.getByRole('spinbutton').fill('0');
            check(!(await healthCard.locator('form').evaluate((form) => form.checkValidity())), 'Zero budget is invalid');
            await healthCard.getByRole('button', { name: 'Hủy', exact: true }).click();
            await page.route('**/api/budgets', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Không thể lưu ngân sách thử nghiệm.' }) }));
            await healthCard.getByRole('button', { name: 'Sửa ngân sách', exact: true }).click();
            await healthCard.getByRole('spinbutton').fill('250000');
            await healthCard.getByRole('button', { name: 'Lưu ngân sách', exact: true }).click();
            await page.getByRole('alert').filter({ hasText: 'Không thể lưu ngân sách thử nghiệm.' }).waitFor();
            await totalIs('1.550.000đ');
            await page.unroute('**/api/budgets');
            await healthCard.getByRole('button', { name: 'Hủy', exact: true }).click();
            check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Budget layout fits mobile width');
            await page.screenshot({ path: path.join(tmpdir(), 'cnpm-budget-mobile.png'), fullPage: true });
            await page.setViewportSize({ width: 1280, height: 900 });
            check(await page.locator('.budget-category-grid').evaluate((grid) => getComputedStyle(grid).gridTemplateColumns.split(' ').length === 2), 'Budget cards use two columns on desktop');
            await page.screenshot({ path: path.join(tmpdir(), 'cnpm-budget-desktop.png'), fullPage: true });
            await page.setViewportSize({ width: 390, height: 844 });
            await page.goto(`${origin}/transactions/new`);
            check(!(await page.locator('form').first().evaluate((form) => form.checkValidity())), 'Empty transaction form is invalid');
            check(!(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)), 'Transaction form fits mobile width');
            await page.goto(`${origin}/profile`);
            await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
            await page.getByText('Bạn chưa đăng nhập', { exact: true }).waitFor();
            check(pageErrors.length === 0, `No browser exceptions: ${pageErrors.join(', ')}`);
        } finally { await browser.close(); }
    }
    console.log(`PASS: ${checks} integration checks (auth, CSRF, isolation, ledger, exact amounts, rollback, reports, setup, pages).`);
} catch (error) {
    console.error(error);
    console.error(serverLog);
    process.exitCode = 1;
} finally {
    if (server && server.exitCode === null) {
        if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        else server.kill('SIGTERM');
        await new Promise((resolve) => { if (server.exitCode !== null) resolve(); else server.once('exit', resolve); });
    }
    // Only generated test resources may be removed.
    assert.match(dbName, /^cnpm_test_[a-f0-9]{12}$/);
    assert.match(dbUser, /^cnpm_t_[a-f0-9]{12}$/);
    await admin.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await admin.query('DROP USER IF EXISTS ?@?', [dbUser, '127.0.0.1']);
    await admin.end();
    const directory = path.resolve(distDir);
    assert.equal(path.dirname(directory), process.cwd());
    assert.match(path.basename(directory), /^\.next-test-[a-f0-9]{12}$/);
    await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    assert.match(testTsconfig, /^\.tsconfig-test-[a-f0-9]{12}\.json$/);
    await rm(path.resolve(testTsconfig), { force: true });
}
