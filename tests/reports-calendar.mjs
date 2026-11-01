import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
const browser = await chromium.launch({ channel: 'msedge' });
try {
 const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
 await page.route('**/api/finance?**', async route => {
  const url = new URL(route.request().url());
  const start = url.searchParams.get('start');
  const isDay = start === url.searchParams.get('end');
  const date = start.slice(0, 8) + '17';
  await route.fulfill({ json: { income: 500000, expense: 60000, budget: 0, budgetAmount: 0, budgetSpent: 0, hasMore: isDay && url.searchParams.get('page') === '1', daily: [{ date, income: '500000', expense: '60000' }], breakdown: [{ name: 'Ăn uống', kind: 'expense', amount: '60000' }], transactions: isDay ? [{ id: 'fixture', kind: 'expense', amount: '60000', bookedOn: start, note: 'Ăn trưa', wallet: 'Tiền mặt', reversesId: null, reversed: false }] : [] } });
 });
 await page.goto(process.env.REPORTS_TEST_ORIGIN || 'http://localhost:3107/reports');
 await page.getByRole('button', { name: 'Chi tiết', exact: true }).waitFor();
 await page.locator('.calendar-day').first().waitFor();
 assert.equal(await page.locator('.donut').count(), 0);
 await page.locator('.calendar-day').filter({ has: page.locator('span', { hasText: /^17$/ }) }).click();
 await page.getByText('Ăn trưa', { exact: true }).waitFor();
 await page.getByRole('button', { name: 'Trang sau' }).click();
 await page.getByText('Trang 2', { exact: true }).waitFor();
 await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
 await page.locator('.donut').waitFor();
 await page.getByRole('button', { name: 'Lịch', exact: true }).click();
 assert.equal(await page.locator('.calendar-day[aria-pressed="true"] > span').textContent(), '17');
 for (const width of [320, 390, 1280]) {
  await page.setViewportSize({ width, height: 900 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}`);
 }
 await page.setViewportSize({ width: 390, height: 1000 });
 await page.screenshot({ path: join(tmpdir(), 'reports-calendar-preview.png'), fullPage: true });
 console.log('PASS: calendar, selection, pagination, details, preserved day, responsive widths (mock API).');
} finally { await browser.close(); }

