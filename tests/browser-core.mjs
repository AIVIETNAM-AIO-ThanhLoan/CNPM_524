import assert from 'node:assert/strict';
import { createECDH, randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { chromium } from 'playwright';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

export async function browserCoreChecks({ origin, admin, check }) {
    const profile = await mkdtemp(path.join(tmpdir(), 'cnpm-pwa-browser-'));
    const context = await chromium.launchPersistentContext(profile, { headless: true, viewport: { width: 390, height: 844 }, serviceWorkers: 'allow', ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
    const page = context.pages()[0] || await context.newPage();
    const errors = [];
    const postedRequests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    context.on('request', (request) => { if (request.url() === `${origin}/api/transactions` && request.method() === 'POST') postedRequests.push(request.postDataJSON()); });
    const password = 'PWA-Testing-Password';
    const post = async (url, data) => {
        const response = await context.request.post(`${origin}${url}`, { data, headers: { Origin: origin } });
        assert.ok(response.ok(), `${url}: ${await response.text()}`);
        return response.json();
    };
    const login = async (account) => {
        await page.goto(`${origin}/login`);
        await page.getByPlaceholder('Số điện thoại hoặc email').fill(account);
        await page.getByPlaceholder('Mật khẩu', { exact: true }).fill(password);
        await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
        await page.waitForURL('**/profile');
    };
    const entries = () => page.evaluate(async () => {
        const db = await new Promise((resolve, reject) => { const request = indexedDB.open('cnpm-offline', 1); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        const items = await new Promise((resolve, reject) => { const request = db.transaction('outbox', 'readonly').objectStore('outbox').getAll(); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
        db.close(); return items;
    });
    async function until(predicate, message) {
        const deadline = Date.now() + 30000;
        do {
            try { if (await predicate()) return; }
            catch (error) { if (!/Execution context was destroyed|Cannot find context/.test(error.message)) throw error; }
            await new Promise((resolve) => setTimeout(resolve, 100));
        } while (Date.now() < deadline);
        throw new Error(message);
    }
    const waitEntries = (count) => until(async () => (await entries()).length === count, `Expected ${count} queued entries`);
    const fillTransaction = async (note, amount = '12345') => {
        await page.locator('input[name=amount]').fill(amount);
        await page.locator('input[name=note]').fill(note);
        await page.getByRole('button', { name: /^(Lưu giao dịch|Lưu trên thiết bị)$/ }).click();
    };
    try {
        await post('/api/auth/register', { name: 'Offline A', account: 'pwa-a@example.com', password });
        await post('/api/auth/register', { name: 'Offline B', account: 'pwa-b@example.com', password });
        await login('pwa-a@example.com');
        const userId = (await (await context.request.get(`${origin}/api/auth/me`)).json()).user.id;
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
        await until(() => page.evaluate(async () => {
            const db = await new Promise((resolve) => { const request = indexedDB.open('cnpm-offline', 1); request.onsuccess = () => resolve(request.result); });
            const active = await new Promise((resolve) => { const request = db.transaction('data', 'readonly').objectStore('data').get('active'); request.onsuccess = () => resolve(request.result); });
            db.close(); return Boolean(active);
        }), 'Offline account cache is ready');
        const manifest = await (await context.request.get(`${origin}/manifest.webmanifest`)).json();
        check(manifest.display === 'standalone' && manifest.icons.some((i) => i.sizes === '192x192') && manifest.icons.some((i) => i.sizes === '512x512') && manifest.icons.some((i) => i.purpose === 'maskable'), 'Installable manifest provides standalone mode and required icon sizes');
        check((await context.request.get(`${origin}/icon-192.png`)).ok(), 'Install icon is available');
        const cdp = await context.newCDPSession(page);
        const installation = await cdp.send('Page.getInstallabilityErrors');
        check(installation.installabilityErrors.length === 0, `Browser installation criteria: ${JSON.stringify(installation.installabilityErrors)}`);
        await cdp.detach();
        const cacheUrls = await page.evaluate(async () => {
            // Tên cache tăng phiên bản mỗi khi đổi shell offline, nên tìm theo tiền tố.
            const name = (await caches.keys()).find((key) => key.startsWith('tingting-static-'));
            const cache = await caches.open(name); return (await cache.keys()).map((request) => new URL(request.url).pathname);
        });
        check(cacheUrls.includes('/offline') && cacheUrls.every((url) => url === '/offline' || url.startsWith('/_next/static/') || url.startsWith('/icon-')), 'Service worker caches the public shell and assets only');

        await context.setOffline(true);
        await page.goto(`${origin}/transactions/new`);
        await page.getByRole('heading', { name: 'Ghi giao dịch', exact: true }).waitFor();
        check(await page.locator('select[name=walletId] option').count() === 2, 'Offline navigation loads cached wallets');
        await fillTransaction('Offline survives reload');
        await page.getByText('Đã lưu trên thiết bị, chờ đồng bộ khi có mạng và đăng nhập đúng tài khoản.', { exact: true }).waitFor();
        await waitEntries(1);
        const firstKey = (await entries())[0].requestKey;
        await page.getByRole('button', { name: 'Lưu trên thiết bị', exact: true }).click();
        check((await entries()).length === 1 && (await entries())[0].requestKey === firstKey, 'Repeated offline submission keeps the original request key');
        await page.reload();
        await page.getByText(/Offline survives reload ·/).waitFor();
        check((await entries())[0].userId === userId, 'Offline queue survives a full reload and belongs to its account');
        await page.screenshot({ path: path.join(tmpdir(), 'cnpm-pwa-offline.png'), fullPage: true });
        await context.setOffline(false);
        await waitEntries(0);
        const [[synced]] = await admin.execute('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ? AND request_key = ?', [userId, firstKey]);
        const [syncRows] = await admin.query("SELECT user_id, request_key, note FROM transactions WHERE note = 'Offline survives reload'");
        check(synced.n === 1, `Reconnect synchronizes once with the original request key: count=${synced.n}, key=${firstKey}, user=${userId}, posts=${JSON.stringify(postedRequests)}, rows=${JSON.stringify(syncRows)}, entries=${JSON.stringify(await entries())}`);

        // Ambiguous network result: the server commits but the response never reaches the browser.
        await page.route('**/api/transactions', async (route) => { await route.fetch(); await route.abort('failed'); });
        await page.goto(`${origin}/transactions/new`);
        await fillTransaction('Ambiguous response', '321');
        await page.getByText('Đã lưu trên thiết bị, chờ đồng bộ khi có mạng và đăng nhập đúng tài khoản.', { exact: true }).waitFor();
        const ambiguousKey = (await entries())[0].requestKey;
        await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).click();
        await page.getByRole('button', { name: 'Lưu giao dịch', exact: true }).waitFor({ state: 'visible' });
        await page.unroute('**/api/transactions');
        await page.getByRole('button', { name: 'Thử đồng bộ', exact: true }).click();
        await waitEntries(0);
        const [[ambiguousCount]] = await admin.execute('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ? AND request_key = ?', [userId, ambiguousKey]);
        check(ambiguousCount.n === 1, 'Lost response and retries never duplicate the ledger');

        await page.route('**/api/transactions', (route) => route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Danh mục không còn hoạt động thử nghiệm.' }) }));
        await page.goto(`${origin}/transactions/new`); await fillTransaction('Failed state', '222');
        await page.getByText(/Failed state · 222đ · Gửi thất bại/).waitFor();
        check((await entries())[0].state === 'failed', 'Definitive rejection is visibly marked failed');
        await page.unroute('**/api/transactions');
        await page.getByRole('button', { name: 'Thử đồng bộ', exact: true }).click(); await waitEntries(0);

        await context.setOffline(true); await page.goto(`${origin}/transactions/new`); await fillTransaction('Expired session retains entry', '333');
        await waitEntries(1); const expiredKey = (await entries())[0].requestKey;
        await admin.execute('UPDATE sessions SET expires_at = UTC_TIMESTAMP() - INTERVAL 1 SECOND WHERE user_id = ?', [userId]);
        await context.setOffline(false);
        await page.goto(`${origin}/login`);
        check((await entries()).length === 1, 'Expired session retains unsent entries');
        await login('pwa-b@example.com'); await page.goto(`${origin}/offline`);
        await page.getByRole('heading', { name: 'Giao dịch chưa gửi (0)', exact: true }).waitFor();
        check(await page.getByText(/Expired session retains entry ·/).count() === 0, 'Account B cannot see account A pending entries');
        const [[noCrossAccount]] = await admin.execute('SELECT COUNT(*) AS n FROM transactions WHERE request_key = ?', [expiredKey]);
        check(noCrossAccount.n === 0, 'Switching accounts never synchronizes another account queue');
        await login('pwa-a@example.com'); await waitEntries(0);
        const [[afterLogin]] = await admin.execute('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ? AND request_key = ?', [userId, expiredKey]);
        check(afterLogin.n === 1, 'Correct session resumption synchronizes the retained original key');

        await page.route('**/api/transactions', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Tạm mất kết nối.' }) }));
        await page.goto(`${origin}/transactions/new`); await fillTransaction('Keep at logout', '444'); await waitEntries(1);
        const logoutKey = (await entries())[0].requestKey;
        await page.goto(`${origin}/profile`);
        await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
        // Hộp xác nhận chung của ứng dụng (không còn dùng window.confirm).
        await page.getByRole('dialog', { name: 'Đăng xuất khi còn giao dịch chưa gửi?' }).getByRole('button', { name: 'Ở lại', exact: true }).click();
        await until(() => page.getByRole('button', { name: 'Đăng xuất', exact: true }).isEnabled(), 'Logout cancellation completes');
        check((await (await context.request.get(`${origin}/api/auth/me`)).json()).user.id === userId, 'Dismissing the pending-entry warning cancels logout');
        await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
        await page.getByRole('dialog', { name: 'Đăng xuất khi còn giao dịch chưa gửi?' }).getByRole('button', { name: 'Đăng xuất', exact: true }).click();
        await page.getByText('Bạn chưa đăng nhập', { exact: true }).waitFor();
        check((await entries()).some((item) => item.requestKey === logoutKey), 'Confirmed logout retains unsent entries on the device');
        await page.unroute('**/api/transactions'); await login('pwa-a@example.com'); await waitEntries(0);

        // Exercise permission handling and subscription storage without contacting a real push service.
        const ecdh = createECDH('prime256v1'); ecdh.generateKeys();
        const subscription = { endpoint: 'https://fcm.googleapis.com/fcm/send/browser-test', keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: randomBytes(16).toString('base64url') } };
        await page.goto(`${origin}/notifications`);
        await page.evaluate(() => { Notification.requestPermission = async () => 'denied'; });
        await page.getByRole('button', { name: 'Bật thông báo', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Bạn chưa cho phép thông báo.' }).waitFor(); check(true, 'Push permission denial is explained');
        await context.grantPermissions(['notifications']);
        await page.evaluate((subscription) => {
            Notification.requestPermission = async () => 'granted';
            let current = null;
            PushManager.prototype.getSubscription = async () => current;
            PushManager.prototype.subscribe = async () => { current = { endpoint: subscription.endpoint, toJSON: () => subscription, unsubscribe: async () => { current = null; return true; } }; return current; };
        }, subscription);
        await page.getByRole('button', { name: 'Bật thông báo', exact: true }).click();
        await page.getByText('Đã bật thông báo trên thiết bị này.', { exact: true }).waitFor();
        const [[pushStored]] = await admin.execute('SELECT COUNT(*) AS n FROM push_subscriptions WHERE user_id = ?', [userId]);
        check(pushStored.n === 1, 'Browser subscription is stored for the signed-in account');
        const worker = context.serviceWorkers()[0];
        const payload = { id: randomUUID(), userId };
        const dispatchPush = (data) => worker.evaluate(async (payload) => {
            const promises = [];
            const event = new PushEvent('push', { data: JSON.stringify(payload) });
            Object.defineProperty(event, 'waitUntil', { value: (promise) => promises.push(promise) });
            self.dispatchEvent(event); await Promise.all(promises);
            return (await self.registration.getNotifications()).map((item) => ({ title: item.title, tag: item.tag }));
        }, data);
        await dispatchPush(payload); const shown = await dispatchPush(payload);
        check(shown.filter((item) => item.tag === payload.id).length === 1, 'Service worker deduplicates repeated push events');
        await page.getByRole('button', { name: 'Tắt thông báo', exact: true }).click();
        await page.getByText('Đã tắt thông báo trên thiết bị này.', { exact: true }).waitFor();

        await page.goto(`${origin}/scan`);
        await page.getByLabel('Chọn ảnh QR', { exact: true }).setInputFiles(fileURLToPath(new URL('./fixtures/vietqr.png', import.meta.url)));
        await page.getByRole('heading', { name: 'Kiểm tra người nhận', exact: true }).waitFor();
        check(await page.getByText('0123456789', { exact: true }).isVisible(), 'QR recipient is displayed for review');
        check(await page.getByLabel('Thiết bị', { exact: true }).count() === 0 && !await page.getByLabel('Chọn ảnh QR', { exact: true }).isVisible(), 'Successful scan hides old controls and detects the device automatically');
        await page.getByLabel('Ứng dụng ngân hàng', { exact: true }).selectOption('vcb');
        check(await page.getByRole('button', { name: 'Tạo liên kết mở ứng dụng', exact: true }).isDisabled(), 'QR requires explicit recipient review');
        await page.getByRole('checkbox').check();
        await page.getByRole('button', { name: 'Tạo liên kết mở ứng dụng', exact: true }).click();
        const bankLink = page.getByRole('link', { name: 'Mở VCB Digibank', exact: true }); await bankLink.waitFor();
        const deep = new URL(await bankLink.getAttribute('href'));
        check(deep.hostname === 'dl.vietqr.io' && deep.searchParams.get('ba') === '0123456789@mb' && deep.searchParams.get('app') === 'vcb', 'Browser presents the correct bank app and recipient deep link');
        await page.screenshot({ path: path.join(tmpdir(), 'cnpm-vietqr-review.png'), fullPage: true });
        await context.setOffline(true);
        await page.getByText('Đang ngoại tuyến. VietQR chỉ dùng khi có mạng.', { exact: true }).waitFor();
        check(await page.getByRole('button', { name: 'Tạo liên kết mở ứng dụng', exact: true }).isDisabled() && await bankLink.count() === 0, 'Connectivity loss disables QR and removes the outgoing bank link');
        await context.setOffline(false);

        await page.getByRole('button', { name: 'Quét mã khác', exact: true }).click();
        const imageInput = page.getByLabel('Chọn ảnh QR', { exact: true });
        await imageInput.setInputFiles({ name: 'blank.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="white"/></svg>') });
        await page.getByRole('alert').filter({ hasText: 'Không tìm thấy mã QR trong ảnh.' }).waitFor();
        check(await page.getByRole('heading', { name: 'Kiểm tra người nhận', exact: true }).count() === 0 && await bankLink.count() === 0, 'An image without QR clears the previous recipient and link');
        await imageInput.setInputFiles(fileURLToPath(new URL('./fixtures/vietqr.png', import.meta.url)));
        await page.getByRole('heading', { name: 'Kiểm tra người nhận', exact: true }).waitFor();
        check(await page.getByText('0123456789', { exact: true }).isVisible() && !(await page.getByRole('checkbox').isChecked()), 'Image upload decodes QR and requires a fresh recipient review');

        // Keep the QR above the center crop to exercise full-frame scanning and track cleanup.
        const png = (await readFile(new URL('./fixtures/vietqr.png', import.meta.url))).toString('base64');
        await page.evaluate(async (data) => {
            const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
            const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = 1200;
            const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 120, 80, 360, 360);
            const stream = canvas.captureStream(10); window.testCameraTracks = stream.getTracks();
            navigator.mediaDevices.getUserMedia = async () => stream;
        }, png);
        await page.getByRole('button', { name: 'Quét mã khác', exact: true }).click();
        await until(() => page.evaluate(() => window.testCameraTracks.every((track) => track.readyState === 'ended')), 'Camera scan completes and stops the synthetic stream');
        await page.getByRole('heading', { name: 'Kiểm tra người nhận', exact: true }).waitFor();
        check(await page.evaluate(() => window.testCameraTracks.every((track) => track.readyState === 'ended')), 'Camera decoder reads a valid QR and stops its tracks');
        check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), 'QR review fits mobile width');

        await login('pwa-b@example.com');
        const hiddenPush = await dispatchPush({ id: randomUUID(), userId });
        check(hiddenPush.length === shown.length, 'Push for account A is suppressed after switching to account B');
        check(errors.length === 0, `No PWA browser exceptions: ${errors.join(', ')}`);
    } finally {
        await context.close();
        assert.equal(path.dirname(profile), path.resolve(tmpdir()));
        assert.match(path.basename(profile), /^cnpm-pwa-browser-/);
        await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
}
