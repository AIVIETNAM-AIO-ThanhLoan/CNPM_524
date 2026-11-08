import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import ts from 'typescript';
import { chromium } from 'playwright';

// Unit checks keep old preferences compatible and scope saved source lists to an account.
const source = await readFile('app/lib/default-preferences.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { readDefaults, saveDefaults } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
const original = { walletId: 'wallet-a', androidApp: 'mb', iosApp: 'vcb' };
saveDefaults('alice', original);
assert.deepEqual(readDefaults('alice'), original);
saveDefaults('alice', { ...original, spendingSources: [{ id: 'bank:970436', name: 'Vietcombank', kind: 'bank' }] });
assert.equal(readDefaults('alice').spendingSources[0].name, 'Vietcombank');
assert.equal(readDefaults('bob').spendingSources, undefined);
store.set('cnpm-defaults:alice', JSON.stringify({ ...original, spendingSources: [null, 4, {}, { id: 'x', name: 'X', kind: 'invalid' }, { id: 'momo', name: 'MoMo', kind: 'ewallet' }, { id: 'momo', name: 'MoMo', kind: 'ewallet' }] }));
assert.deepEqual(readDefaults('alice').spendingSources, [{ id: 'momo', name: 'MoMo', kind: 'ewallet' }]);
store.set('cnpm-defaults:alice', 'invalid');
assert.equal(readDefaults('alice').walletId, '');
const optionsSource = await readFile('app/lib/spending-source-options.ts', 'utf8');
const optionsJs = ts.transpileModule(optionsSource, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { spendingSourceOptions } = await import(`data:text/javascript;base64,${Buffer.from(optionsJs).toString('base64')}`);
const sampleWallets = [{ id: 'cash', name: 'Tiền mặt', balance: '200000' }, { id: 'bank', name: 'Ví đã đổi tên', balance: '1000000', sourceKey: 'bank:970436' }];
const chosenSources = [{ id: 'bank:970436', name: 'Vietcombank', kind: 'bank' }, { id: 'ewallet:momo', name: 'MoMo', kind: 'ewallet' }];
assert.equal(spendingSourceOptions(sampleWallets, undefined).length, 2);
assert.deepEqual(spendingSourceOptions(sampleWallets, []), []);
assert.deepEqual(spendingSourceOptions(sampleWallets, chosenSources).map(option => option.name), ['Vietcombank', 'MoMo']);
assert.equal(spendingSourceOptions(sampleWallets, chosenSources)[0].balance, '1000000');
assert.equal(spendingSourceOptions(sampleWallets, [...chosenSources, { id: 'wallet:bank', name: 'Ví đã đổi tên', kind: 'wallet' }]).length, 2);

// Browser checks run against a disposable database; no real account or wallet is changed.
nextEnv.loadEnvConfig(process.cwd());
const suffix = randomBytes(6).toString('hex');
const database = `cnpm_test_${suffix}`;
const dbUser = `cnpm_t_${suffix}`;
const distDir = `.next-test-sources-${suffix}`;
const tsconfigFile = `.tsconfig-test-sources-${suffix}.json`;
const socket = createServer();
await new Promise(resolve => socket.listen(0, '127.0.0.1', resolve));
const port = socket.address().port;
await new Promise(resolve => socket.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const env = { ...process.env, DB_NAME: database, DB_USER: dbUser, DB_PASSWORD: randomBytes(32).toString('hex'),
    APP_ORIGIN: origin, COOKIE_SECURE: 'false', NODE_ENV: 'production', CNPM_TEST_BUILD_DIR: distDir,
    CNPM_TEST_TSCONFIG: tsconfigFile, NEXT_TELEMETRY_DISABLED: '1', CNPM_TEST_UPSTREAM: 'true',
    DEEPSEEK_API_KEY: '', TAVILY_API_KEY: '', VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '' };
env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --import=${pathToFileURL(resolve('tests/upstream.mjs')).href}`.trim();
const admin = await mysql.createConnection({ host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_SETUP_USER, password: env.DB_SETUP_PASSWORD });
const originalNextEnv = await readFile('next-env.d.ts');
const config = JSON.parse(await readFile('tsconfig.json', 'utf8'));
config.include.push(`${distDir}/types/**/*.ts`, `${distDir}/dev/types/**/*.ts`);
await writeFile(tsconfigFile, JSON.stringify(config, null, 2));
let server, browser;
try {
    for (const args of [['scripts/setup-database.mjs'], ['node_modules/next/dist/bin/next', 'build']]) {
        const result = spawnSync(process.execPath, args, { env, encoding: 'utf8', windowsHide: true, timeout: 180000 });
        assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    }
    server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let serverLog = '';
    server.stdout.on('data', data => serverLog += data);
    server.stderr.on('data', data => serverLog += data);
    for (let i = 0; i < 80; i++) {
        if (server.exitCode !== null) throw new Error(serverLog);
        try { if ((await fetch(`${origin}/api/auth/me`)).ok) break; } catch { /* startup */ }
        await new Promise(resolve => setTimeout(resolve, 250));
    }
    browser = await chromium.launch({ channel: 'msedge' });
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    const password = 'Sources-Testing!2026';
    const account = `sources-${suffix}@example.com`;
    const register = await context.request.post(`${origin}/api/auth/register`, { headers: { Origin: origin }, data: { name: 'Minh Anh', account, password } });
    assert.ok(register.ok());
    const login = await context.request.post(`${origin}/api/auth/login`, { headers: { Origin: origin }, data: { account, password } });
    assert.ok(login.ok());
    const userId = (await (await context.request.get(`${origin}/api/auth/me`)).json()).user.id;
    const wallets = (await (await context.request.get(`${origin}/api/wallets`)).json()).wallets;
    const page = await context.newPage();
    page.setDefaultTimeout(12000);
    const errors = [];
    const financialWrites = [];
    page.on('pageerror', error => errors.push(error.message));
    context.on('request', request => { if (request.method() !== 'GET' && /\/api\/(wallets|transactions)(\?|$)/.test(request.url())) financialWrites.push(request.url()); });
    await page.goto(`${origin}/profile`);
    await page.evaluate(({ userId, walletId }) => localStorage.setItem(`cnpm-defaults:${userId}`, JSON.stringify({ walletId, androidApp: 'mb', iosApp: 'vcb' })), { userId, walletId: wallets[1].id });
    await page.reload();
    const settings = page.locator('.default-settings');
    const trigger = settings.getByRole('button', { name: /^Nguồn chi/ });
    await trigger.click();
    const panel = settings.locator('.sources-panel');
    await panel.getByRole('switch', { name: 'Sử dụng Vietcombank', exact: true }).waitFor();
    assert.equal(await settings.getByLabel('Ví mặc định', { exact: true }).count(), 0);
    for (const name of ['MoMo', 'Vietcombank', 'Tiền mặt']) {
        await panel.getByRole('switch', { name: `Sử dụng ${name}`, exact: true }).click();
        assert.equal(await panel.getByRole('switch', { name: `Sử dụng ${name}`, exact: true }).getAttribute('aria-checked'), 'true');
    }
    await panel.getByRole('button', { name: 'Xong', exact: true }).click();
    assert.equal(await panel.count(), 0);
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    assert.ok((await trigger.innerText()).includes('3 nguồn đã chọn'));
    // Other settings must preserve the source selection when updating the same storage object.
    await settings.getByLabel('Ngân hàng mặc định', { exact: true }).selectOption('vcb');
    const read = () => page.evaluate(userId => JSON.parse(localStorage.getItem(`cnpm-defaults:${userId}`)), userId);
    assert.equal((await read()).spendingSources.length, 3);
    assert.equal((await read()).walletId, wallets[1].id);
    await page.reload();
    await trigger.click();
    assert.equal(await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).getAttribute('aria-checked'), 'true');
    const search = panel.getByRole('searchbox', { name: 'Tìm ngân hàng hoặc ví' });
    await search.fill('ngoai thuong');
    assert.equal(await panel.getByRole('switch').count(), 1);
    assert.equal(await panel.getByRole('switch', { name: 'Sử dụng Vietcombank', exact: true }).count(), 1);
    await search.fill('khong co ngan hang nay');
    assert.ok(await panel.getByText('Không tìm thấy ngân hàng hoặc ví phù hợp.', { exact: true }).isVisible());
    await search.fill('');
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        const cardBounds = await settings.boundingBox();
        const panelBounds = await panel.boundingBox();
        const done = await panel.getByRole('button', { name: 'Xong', exact: true }).boundingBox();
        assert.ok(panelBounds.width < cardBounds.width);
        assert.ok(panelBounds.height <= 440);
        assert.ok(done.x > panelBounds.x + panelBounds.width / 2, 'Done stays in the right side of the inner panel');
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        assert.ok(await panel.locator('.sources-scroll').evaluate(element => element.scrollHeight > element.clientHeight), 'The source list scrolls inside the panel');
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await mkdir('outputs', { recursive: true });
    await settings.screenshot({ path: 'outputs/spending-sources-390.png' });
    await search.focus();
    await page.keyboard.press('Escape');
    assert.equal(await panel.count(), 0);
    assert.ok(await trigger.evaluate(element => element === document.activeElement));
    await trigger.click();
    await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).focus();
    await page.keyboard.press('Space');
    assert.equal(await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).getAttribute('aria-checked'), 'false');
    assert.equal((await read()).spendingSources.length, 2);

    const other = await context.newPage();
    await other.goto(`${origin}/profile`);
    await other.locator('.default-settings').getByRole('button', { name: /^Nguồn chi/ }).click();
    await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).click();
    await other.waitForFunction(() => document.querySelector('[aria-label="Sử dụng MoMo"]')?.getAttribute('aria-checked') === 'true');
    await other.close();

    await page.route('**/api/vietqr?**', route => route.fulfill({ status: 502, json: { error: 'Không tải được danh sách ngân hàng thử nghiệm.' } }));
    await settings.getByLabel('Thiết bị mở ngân hàng', { exact: true }).selectOption('ios');
    await panel.getByRole('alert').filter({ hasText: 'Không tải được danh sách ngân hàng thử nghiệm.' }).waitFor();
    assert.ok(await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).isEnabled());
    await page.unroute('**/api/vietqr?**');
    await panel.getByRole('button', { name: 'Thử lại', exact: true }).click();
    await panel.getByRole('alert').waitFor({ state: 'detached' });

    await page.evaluate(() => { Storage.prototype.setItem = () => { throw new Error('Storage denied'); }; });
    await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).click();
    await panel.getByRole('alert').filter({ hasText: 'Không lưu được lựa chọn.' }).waitFor();
    assert.equal(await panel.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).getAttribute('aria-checked'), 'true');
    assert.deepEqual(financialWrites, [], 'The selection only saves a list, without creating wallets or transactions');
    assert.equal((await (await context.request.get(`${origin}/api/wallets`)).json()).wallets.length, wallets.length);
    assert.deepEqual(errors, []);
    console.log('PASS: inline source picker, search, switches, Done/Escape, persistence, account-scoped preferences, cross-tab sync, responsive bounds, retry and storage failures. No financial accounts changed.');

    // The selected list now drives real transaction options. Ledger fixtures remain disposable.
    await page.reload();
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const categories = (await (await context.request.get(`${origin}/api/categories`)).json()).categories;
    const expenseCategory = categories.find(category => category.kind === 'expense').id;
    const allWallets = async () => (await (await context.request.get(`${origin}/api/wallets`)).json()).wallets;
    const post = (path, body, requestContext = context) => requestContext.request.post(origin + path, { headers: { Origin: origin }, data: body });
    const preexistingResponse = await post('/api/wallets', { name: 'Vietcombank' });
    assert.ok(preexistingResponse.ok());
    const preexistingBank = (await preexistingResponse.json()).id;
    await page.goto(`${origin}/transactions/new`);
    await page.waitForFunction(() => document.querySelector('select[name="walletId"]')?.textContent.includes('MoMo'));
    assert.equal(await page.locator('select[name=walletId] option').count(), 3);
    assert.equal(await page.locator('select[name=walletId] option').filter({ hasText: 'Ngân hàng' }).count(), 0);
    await page.locator('.tx-type-switch').getByText('Thu', { exact: true }).click();
    await page.getByLabel('Ví', { exact: true }).selectOption('bank:970436');
    await page.getByLabel('Số tiền', { exact: true }).fill('100000');
    await page.getByLabel('Ghi chú', { exact: true }).fill('Thu vào Vietcombank');
    await page.locator('.tx-save').click();
    await page.getByRole('status').filter({ hasText: 'Ghi giao dịch thành công.' }).waitFor();
    let list = await allWallets();
    assert.equal(list.find(wallet => wallet.sourceKey === 'bank:970436').id, preexistingBank, 'Reuse a matching wallet without losing its identity');
    assert.equal(list.find(wallet => wallet.sourceKey === 'bank:970436').balance, '100000.00');
    assert.equal(list.length, wallets.length + 1);
    await page.locator('.tx-type-switch').getByText('Chi', { exact: true }).click();
    await page.getByLabel('Ví', { exact: true }).selectOption('ewallet:momo');
    await page.getByLabel('Số tiền', { exact: true }).fill('25000');
    await page.getByLabel('Ghi chú', { exact: true }).fill('Chi từ MoMo');
    await page.locator('.tx-save').click();
    await page.getByRole('status').filter({ hasText: 'Ghi giao dịch thành công.' }).waitFor();
    list = await allWallets();
    const momoId = list.find(wallet => wallet.sourceKey === 'ewallet:momo').id;
    assert.equal(list.find(wallet => wallet.id === momoId).balance, '-25000.00');
    assert.equal(list.length, wallets.length + 2);

    const replay = { kind: 'expense', walletSource: { id: 'ewallet:momo', name: 'MoMo', kind: 'ewallet' }, categoryId: expenseCategory, amount: '1000', bookedOn: today, note: 'Replay source post', requestKey: randomUUID() };
    const duplicateResponses = await Promise.all([post('/api/transactions', replay), post('/api/transactions', replay)]);
    for (const response of duplicateResponses) assert.equal(response.status(), 201);
    assert.equal((await duplicateResponses[0].json()).id, (await duplicateResponses[1].json()).id);
    assert.equal((await allWallets()).filter(wallet => wallet.sourceKey === 'ewallet:momo').length, 1);
    await post('/api/wallets', { id: momoId, name: 'Ví MoMo cá nhân' });
    const renamed = await post('/api/transactions', { ...replay, amount: '2000', note: 'After rename', requestKey: randomUUID() });
    assert.equal(renamed.status(), 201);
    assert.equal((await allWallets()).find(wallet => wallet.sourceKey === 'ewallet:momo').id, momoId);
    assert.equal((await allWallets()).find(wallet => wallet.id === momoId).balance, '-28000.00');
    const invalid = await post('/api/transactions', { ...replay, walletSource: { id: 'ewallet:shopeepay', name: 'ShopeePay', kind: 'ewallet' }, categoryId: randomUUID(), requestKey: randomUUID() });
    assert.equal(invalid.status(), 400);
    assert.equal((await allWallets()).some(wallet => wallet.sourceKey === 'ewallet:shopeepay'), false, 'A rejected transaction rolls back its new source wallet');
    const sameSource = await post('/api/transactions', { ...replay, kind: 'transfer', targetSource: replay.walletSource, requestKey: randomUUID() });
    assert.equal(sameSource.status(), 400);
    const transfer = await post('/api/transactions', { ...replay, kind: 'transfer', walletSource: { id: 'bank:970436', name: 'Vietcombank', kind: 'bank' }, targetSource: replay.walletSource, amount: '10000', requestKey: randomUUID() });
    assert.equal(transfer.status(), 201);
    assert.equal((await allWallets()).find(wallet => wallet.id === momoId).balance, '-18000.00');
    assert.equal((await allWallets()).find(wallet => wallet.id === preexistingBank).balance, '90000.00');

    await page.goto(`${origin}/transactions/new`);
    await page.waitForFunction(() => document.querySelector('select[name="walletId"]')?.textContent.includes('MoMo'));
    await page.getByLabel('Ví', { exact: true }).selectOption('ewallet:momo');
    const chooser = await context.newPage();
    await chooser.goto(`${origin}/profile`);
    await chooser.locator('.default-settings').getByRole('button', { name: /^Nguồn chi/ }).click();
    await chooser.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('select[name="walletId"]')?.textContent.includes('MoMo'));
    assert.equal((await allWallets()).find(wallet => wallet.id === momoId).balance, '-18000.00', 'Disabling a source does not archive its wallet or change balance');
    for (const name of ['Vietcombank', 'Tiền mặt']) await chooser.getByRole('switch', { name: `Sử dụng ${name}`, exact: true }).click();
    await page.getByText('Chưa chọn nguồn chi', { exact: true }).waitFor({ state: 'attached' });
    assert.ok(await page.locator('.tx-save').isDisabled());
    await chooser.getByRole('switch', { name: 'Sử dụng MoMo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('select[name="walletId"]')?.value === 'ewallet:momo');
    await page.screenshot({ path: 'outputs/transaction-selected-source.png', fullPage: true });
    await chooser.close();

    const isolated = await browser.newContext({ serviceWorkers: 'block' });
    assert.ok((await isolated.request.post(`${origin}/api/auth/register`, { headers: { Origin: origin }, data: { name: 'Other source user', account: `other-${suffix}@example.com`, password } })).ok());
    assert.ok((await isolated.request.post(`${origin}/api/auth/login`, { headers: { Origin: origin }, data: { account: `other-${suffix}@example.com`, password } })).ok());
    const otherCategory = (await (await isolated.request.get(`${origin}/api/categories`)).json()).categories.find(category => category.kind === 'expense').id;
    assert.equal((await post('/api/transactions', { ...replay, categoryId: otherCategory, walletSource: null, walletId: momoId, requestKey: randomUUID() }, isolated)).status(), 404);
    assert.equal((await post('/api/transactions', { ...replay, categoryId: otherCategory, requestKey: randomUUID() }, isolated)).status(), 201);
    const otherMomo = (await (await isolated.request.get(`${origin}/api/wallets`)).json()).wallets.find(wallet => wallet.sourceKey === 'ewallet:momo');
    assert.notEqual(otherMomo.id, momoId);
    assert.equal(otherMomo.balance, '-1000.00');
    await isolated.close();

    const offlineContext = await browser.newContext({ serviceWorkers: 'allow', storageState: await context.storageState(), viewport: { width: 390, height: 844 } });
    const offlinePage = await offlineContext.newPage();
    await offlinePage.goto(`${origin}/profile`);
    await offlinePage.locator('.default-settings').getByRole('button', { name: /^Nguồn chi/ }).click();
    await offlinePage.getByRole('switch', { name: 'Sử dụng ShopeePay', exact: true }).click();
    await offlinePage.goto(`${origin}/transactions/new`);
    await offlinePage.evaluate(() => navigator.serviceWorker.ready);
    await offlinePage.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
    await offlinePage.getByLabel('Ví', { exact: true }).selectOption('ewallet:shopeepay');
    await offlineContext.setOffline(true);
    await offlinePage.getByLabel('Số tiền', { exact: true }).fill('33000');
    await offlinePage.getByLabel('Ghi chú', { exact: true }).fill('ShopeePay ngoại tuyến');
    await offlinePage.locator('.tx-save').click();
    await offlinePage.getByRole('heading', { name: 'Giao dịch chưa gửi (1)', exact: true }).waitFor();
    await offlinePage.reload();
    await offlinePage.getByText(/ShopeePay ngoại tuyến ·/).waitFor();
    await offlineContext.setOffline(false);
    await offlinePage.locator('.pending-list').waitFor({ state: 'detached' });
    const shopee = (await allWallets()).find(wallet => wallet.sourceKey === 'ewallet:shopeepay');
    assert.equal(shopee.balance, '-33000.00');
    const [[ledger]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${database}\`.transactions WHERE note = ?`, ['ShopeePay ngoại tuyến']);
    assert.equal(ledger.n, 1);
    const [[unbalanced]] = await admin.query(`SELECT COUNT(*) AS n FROM (SELECT transaction_id FROM \`${database}\`.transaction_entries GROUP BY transaction_id HAVING SUM(amount) <> 0 OR COUNT(*) <> 2) bad`);
    assert.equal(unbalanced.n, 0);
    await offlineContext.close();
    assert.deepEqual(errors, []);
    console.log('PASS: selected sources drive the transaction form, named-wallet reuse, source balances, concurrent replay, renaming, rollback, transfers, live preference changes, account isolation and offline-first provisioning. Ledger remains balanced.');
} finally {
    await browser?.close();
    if (server) { server.kill(); await new Promise(resolve => server.once('close', resolve)); }
    if (!/^cnpm_test_[a-f0-9]{12}$/.test(database) || !/^cnpm_t_[a-f0-9]{12}$/.test(dbUser)) throw new Error('Unexpected fixture identifier');
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.query('DROP USER IF EXISTS ?@?', [dbUser, '127.0.0.1']);
    await admin.end();
    await writeFile('next-env.d.ts', originalNextEnv);
}
