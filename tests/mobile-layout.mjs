import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = process.env.MOBILE_TEST_ORIGIN || 'http://localhost:3000';
const output = join(tmpdir(), 'cnpm-mobile-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge' });
const failures = [];
const redirects = new Set();
try {
  const page = await browser.newPage();
  await page.route('**/api/finance?**', route => route.fulfill({ json: {
    income: 12000000, expense: 2345678, budget: 30, budgetAmount: 6000000, budgetSpent: 1800000,
    transactions: [], hasMore: false, breakdown: [{ name: 'Ăn uống', kind: 'expense', amount: '2345678' }], daily: [],
  } }));
  await page.route('**/api/categories?**', route => route.fulfill({ json: { categories: [{ id: '1', name: 'Chi phí sinh hoạt và ăn uống', kind: 'expense', archived: false }] } }));
  await page.route('**/api/budgets?**', route => route.fulfill({ json: { budgets: [{ categoryId: '1', name: 'Chi phí sinh hoạt và ăn uống', amount: '6000000', spent: '1800000' }], totalAmount: '6000000' } }));
  const routes = ['/', '/budgets', '/reports', '/profile', '/login', '/register', '/recover', '/transactions/new', '/history', '/manage', '/goals', '/reminders', '/notifications', '/receive-qr', '/scan', '/currency', '/gold', '/chat', '/offline', '/admin'];
  for (const [width, height] of [[320, 740], [390, 844], [844, 390], [1280, 900]]) {
    await page.setViewportSize({ width, height });
    for (const route of routes) {
      await page.goto(origin + route);
      await page.locator('body').waitFor();
      await page.evaluate(() => document.fonts.ready);
      const actual = new URL(page.url()).pathname;
      if (actual !== route) { redirects.add(`${route} -> ${actual}`); continue; }
      const issues = await page.evaluate(({ width }) => {
        const issues = [];
        if (document.documentElement.scrollWidth > innerWidth + 1) issues.push('horizontal overflow');
        if (width < 768) {
          for (const el of document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')) {
            const style = getComputedStyle(el);
            if (el.getBoundingClientRect().height > 0 && style.opacity !== '0' && Number.parseFloat(style.fontSize) < 16) issues.push(`small input text: ${el.className}`);
          }
          for (const el of document.querySelectorAll('button')) {
            const box = el.getBoundingClientRect();
            if (box.height > 0 && box.height < 43.5) issues.push(`short button: ${el.textContent?.trim() || el.getAttribute('aria-label')}`);
          }
        }
        return issues;
      }, { width });
      if (issues.length) failures.push({ route, width, issues });
      if (width === 390) await page.screenshot({ path: join(output, `${route.replaceAll('/', '-') || 'home'}.png`), fullPage: true });
    }
    console.log(`Checked ${width}x${height}`);
  }
  await page.setViewportSize({ width: 390, height: 600 });
  await page.route('**/api/chat', route => route.fulfill({ contentType: 'text/plain', body: 'Nội dung kiểm tra cuộn tin nhắn. '.repeat(250) }));
  await page.goto(origin + '/chat');
  await page.getByRole('textbox', { name: 'Nhập câu hỏi' }).fill('Kiểm tra giao diện');
  await page.getByRole('button', { name: 'Gửi', exact: true }).click();
  await page.locator('.bubble.ai').filter({ hasText: 'Nội dung kiểm tra' }).waitFor();
  const composer = await page.locator('.chat-input-row').boundingBox();
  assert.ok(composer && composer.y + composer.height <= 601, 'Chat composer remains visible after long reply');
  console.log('Redirected protected screens:', [...redirects].join(', '));
  console.log('Screenshots:', output);
  assert.deepEqual(failures, [], JSON.stringify(failures, null, 2));
  console.log('PASS: layout, input sizes, button heights, and chat scrolling. Finance/budget/chat use fixtures; protected screens are excluded after redirects.');
} finally { await browser.close(); }
