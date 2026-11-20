import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
try {
    const page = await browser.newPage();
    let usage = 50;
    await page.route('**/api/categories?**', route => route.fulfill({ json: { categories: [
        { id: '1', name: 'Chi phí sinh hoạt và ăn uống', kind: 'expense' },
        { id: '2', name: 'Đi lại', kind: 'expense' },
    ] } }));
    await page.route('**/api/budgets?**', route => route.fulfill({ json: {
        budgets: [{ categoryId: '1', amount: '3000000', spent: String(30000 * usage) }], totalAmount: '3000000',
    } }));
    for (const width of [320, 390, 768, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        for (usage of [0, 50, 80, 99, 100, 125]) {
            await page.goto(`${process.env.BUDGET_TEST_ORIGIN || 'http://localhost:3100'}/budgets`);
            const card = page.locator('.budget-category-card').first();
            await card.waitFor();
            const box = await card.boundingBox();
            assert.ok(box.height < 215, `Compact card at ${width}px, ${usage}%`);
            assert.equal(await card.locator('.budget-border-fill').evaluate(el => getComputedStyle(el).stroke), usage >= 100 ? 'rgb(198, 40, 40)' : 'rgb(20, 117, 78)');
            assert.equal(await card.locator('.budget-border-fill').getAttribute('stroke-dasharray'), `${Math.min(100, usage)} 100`);
            assert.equal(await card.getByRole('progressbar').getAttribute('aria-valuetext'), `${usage}%`);
            assert.equal(await page.locator('progress').count(), 0);
            assert.equal(await page.locator('.budget-category-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length), 2);
            if (usage === 50 && width === 390) await page.screenshot({ path: join(tmpdir(), 'budget-border-green.png'), fullPage: true });
            assert.equal(await page.locator('.budget-category-card').nth(1).locator('.budget-border-fill').count(), 0);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        }
        await page.screenshot({ path: join(tmpdir(), `budget-border-${width}.png`), fullPage: true });
        await page.getByRole('button', { name: 'Tùy chọn danh mục Chi phí sinh hoạt và ăn uống', exact: true }).click();
        await page.getByRole('button', { name: 'Sửa', exact: true }).click();
        await page.getByRole('spinbutton').fill('5000000');
        assert.ok(await page.getByRole('button', { name: 'Lưu ngân sách', exact: true }).isVisible());
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        await page.getByRole('button', { name: 'Hủy', exact: true }).click();
    }
    console.log('Budget border: compact cards, green/red threshold, 0/50/80/99/100/125%, unset budgets and editing passed at 320/390/768/1280px (mocked API).');
} finally {
    await browser.close();
}
