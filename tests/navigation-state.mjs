import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.NAVIGATION_TEST_ORIGIN || 'http://localhost:3000';
const browser = await chromium.launch({ channel: 'msedge' });
try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    const nav = name => page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name, exact: true });
    await page.goto(origin);
    await page.getByRole('button', { name: 'Ngày', exact: true }).click();
    await page.getByRole('button', { name: 'Ngày trước' }).click();
    const day = await page.locator('.period-nav-label').textContent();
    await nav('Báo cáo').click();
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
    await page.getByRole('button', { name: 'Tuần', exact: true }).click();
    await page.getByRole('button', { name: 'Thu nhập', exact: true }).click();
    await page.getByRole('button', { name: 'Kỳ trước' }).click();
    const period = await page.locator('.period-text').textContent();
    await nav('Tôi').click();
    await page.waitForURL('**/profile');
    await page.goBack();
    await page.getByRole('button', { name: 'Chi tiết', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('.report-view-switch button:nth-child(2)')?.getAttribute('aria-pressed') === 'true');
    assert.equal(await page.getByRole('button', { name: 'Tuần', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.match(await page.getByRole('button', { name: 'Thu nhập', exact: true }).getAttribute('class'), /active/);
    assert.equal(await page.locator('.period-text').textContent(), period);
    await nav('Trang chủ').click();
    await page.waitForFunction(() => document.querySelector('.home-segmented-btn:nth-of-type(2)')?.classList.contains('active'));
    assert.equal(await page.locator('.period-nav-label').textContent(), day);
    await page.reload();
    await page.waitForFunction(() => document.querySelector('.home-segmented-btn:nth-of-type(2)')?.classList.contains('active'));
    assert.equal(await page.locator('.period-nav-label').textContent(), day);

    await page.evaluate(() => sessionStorage.setItem('cnpm:home-view', '{bad json'));
    await page.reload();
    await page.getByRole('button', { name: 'Tháng', exact: true }).waitFor();
    assert.match(await page.getByRole('button', { name: 'Tháng', exact: true }).getAttribute('class'), /active/);
    await page.evaluate(() => sessionStorage.setItem('cnpm:reports-view', JSON.stringify({ today: '2000-01-01', screen: 'details' })));
    await nav('Báo cáo').click();
    assert.equal(await page.getByRole('button', { name: 'Lịch', exact: true }).getAttribute('aria-pressed'), 'true');
    const tabs = [['Trang chủ', '/'], ['Ngân sách', '/budgets'], ['Quét QR', '/scan'], ['Báo cáo', '/reports'], ['Tôi', '/profile']];
    for (const [fromName, from] of tabs) for (const [toName, to] of tabs) {
        if (from === to) continue;
        await page.goto(origin + from);
        await nav(toName).click();
        await page.waitForURL(url => url.pathname === to);
        assert.equal(await nav(toName).getAttribute('aria-current'), 'page');
        await page.goBack();
        await page.waitForURL(url => url.pathname === from);
        assert.equal(await nav(fromName).getAttribute('aria-current'), 'page');
        await page.goForward();
        await page.waitForURL(url => url.pathname === to);
    }
    await page.goto(origin + '/scan');
    await page.getByRole('tab', { name: 'QR của tôi' }).click();
    await nav('Tôi').click();
    await page.waitForURL('**/profile');
    await page.goBack();
    await page.waitForURL('**/scan?tab=my-qr');
    await page.waitForFunction(() => document.querySelector('[role=tab][aria-selected=true]')?.textContent === 'QR của tôi');
    console.log('PASS: home and report views survive navigation and reload; invalid and old state falls back safely.');
    console.log('PASS: 20 main-tab transitions, Back/Forward, active tab, and return to QR của tôi.');
} finally { await browser.close(); }
