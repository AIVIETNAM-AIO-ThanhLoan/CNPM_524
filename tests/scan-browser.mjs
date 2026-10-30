import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';

await mkdir('outputs', { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.route('**/api/**', route => route.fulfill({ json: { banks: [{ bin: '970422', shortName: 'MB', name: 'MB Bank' }], apps: [{ appId: 'vcb', appName: 'VCB Digibank', autofill: 0 }] } }));
    await context.addInitScript(() => {
        window.cameraCalls = 0;
        navigator.mediaDevices.getUserMedia = async () => {
            window.cameraCalls++;
            const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 300;
            const ctx = canvas.getContext('2d'); ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 300, 300);
            const stream = canvas.captureStream(5);
            window.cameraTracks = stream.getTracks();
            return stream;
        };
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3124/scan');
    await page.waitForFunction(() => window.cameraCalls > 0);
    await page.waitForFunction(() => document.querySelector('video')?.srcObject?.active);
    assert.equal(await page.getByRole('button', { name: /Bật camera|Dừng camera/ }).count(), 0);
    await page.getByRole('button', { name: 'Chuyển tiền', exact: true }).click();
    await page.waitForFunction(() => window.cameraTracks.every(t => t.readyState === 'ended'));
    await page.getByLabel('Ngân hàng nhận', { exact: true }).selectOption('970422');
    await page.getByLabel('Số tài khoản nhận', { exact: true }).fill('0123456789');
    await page.getByLabel('Số tiền chuyển (VND)', { exact: true }).fill('15000');
    await page.getByLabel('Nội dung chuyển', { exact: true }).fill('Test transfer');
    await page.getByRole('checkbox').check();
    const request = page.waitForRequest(req => req.url().endsWith('/api/vietqr') && req.method() === 'POST');
    await page.getByRole('button', { name: 'Tạo liên kết mở ứng dụng', exact: true }).click();
    const body = (await request).postDataJSON();
    assert.equal(body.account, '0123456789'); assert.equal(body.bankBin, '970422'); assert.equal(body.qr, undefined);
    await page.getByRole('button', { name: 'Quét mã khác', exact: true }).click();
    await page.getByLabel('Chọn ảnh QR', { exact: true }).setInputFiles(fileURLToPath(new URL('./fixtures/vietqr.png', import.meta.url)));
    await page.getByRole('heading', { name: 'Kiểm tra người nhận', exact: true }).waitFor();
    assert.equal(await page.getByLabel('Chọn ảnh QR', { exact: true }).isVisible(), false);
    assert.equal(await page.getByLabel('Thiết bị', { exact: true }).count(), 0);
    assert.equal(await page.locator('#transfer-amount').evaluate(el => el === document.activeElement), true);
    await page.screenshot({ path: 'outputs/scan-review-mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Quét mã khác', exact: true }).click();
    await page.waitForFunction(() => window.cameraCalls > 2);
    await page.locator('.bottom-nav a[href="/profile"]').click();
    await page.waitForURL('**/profile');
    assert.equal(await page.evaluate(() => window.cameraTracks.every(t => t.readyState === 'ended')), true);
    await page.goto('http://localhost:3124/scan');
    await context.setOffline(true);
    await page.getByText('Đang ngoại tuyến. VietQR chỉ dùng khi có mạng.', { exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Chuyển tiền', exact: true }).isDisabled(), true);
    await context.setOffline(false);
    await page.waitForFunction(() => document.querySelector('video')?.srcObject?.active);
    await page.screenshot({ path: 'outputs/scan-camera-mobile.png', fullPage: true });
    console.log('Passed: manual transfer payload, no camera controls, automatic camera, camera cleanup, QR review, amount focus, automatic device, offline notice, mobile screenshots.');
} finally { await browser.close(); }

