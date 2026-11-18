import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from 'typescript';
import { chromium } from 'playwright';

const source = await readFile('app/lib/theme.ts', 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { THEMES, DEFAULT_THEME, THEME_STORAGE_KEY, readTheme } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const store = new Map();
globalThis.localStorage = { getItem: key => store.get(key) ?? null };
assert.equal(readTheme(), DEFAULT_THEME);
store.set(THEME_STORAGE_KEY, 'purple');
assert.equal(readTheme(), 'purple');
store.set(THEME_STORAGE_KEY, 'invalid');
assert.equal(readTheme(), DEFAULT_THEME);
globalThis.localStorage.getItem = () => { throw new Error('Storage denied'); };
assert.equal(readTheme(), DEFAULT_THEME);

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL || 'msedge' });
const origin = process.env.THEME_TEST_ORIGIN || 'http://localhost:3000';
const colors = { blue: '#0b5cad', green: '#16704a', purple: '#7040af', rose: '#ac3668', orange: '#a34e10', slate: '#475569' };
try {
    const context = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } });
    await context.route('**/api/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (path === '/api/auth/me') return route.fulfill({ json: { user: null } });
        if (path === '/api/categories') return route.fulfill({ json: { categories: [{ id: 'food', name: 'Ăn uống', kind: 'expense' }] } });
        if (path === '/api/budgets') return route.fulfill({ json: { budgets: [], totalAmount: '0' } });
        return route.fulfill({ json: {} });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${origin}/profile`);
    await page.getByRole('group', { name: 'Chọn màu giao diện' }).waitFor();
    await page.locator('.theme-option').filter({ hasText: 'Tím' }).click();
    for (const theme of THEMES) {
        await page.locator('.theme-option').filter({ hasText: theme.name }).click();
        await page.waitForFunction(id => document.documentElement.dataset.theme === id, theme.id);
        assert.ok(await page.getByRole('radio', { name: theme.name, exact: true }).isChecked());
        assert.equal(await page.evaluate(key => localStorage.getItem(key), THEME_STORAGE_KEY), theme.id);
        assert.equal(await page.locator('meta[name="theme-color"]').getAttribute('content'), colors[theme.id]);
        const expected = colors[theme.id].slice(1).match(/../g).map(value => parseInt(value, 16));
        await page.waitForFunction(color => getComputedStyle(document.querySelector('.nav-active')).color === color, `rgb(${expected.join(', ')})`);
        const activeColor = await page.locator('.nav-active').evaluate(el => getComputedStyle(el).color);
        assert.equal(activeColor, `rgb(${expected.join(', ')})`);
    }
    await page.getByRole('radio', { name: 'Xám', exact: true }).focus();
    await page.keyboard.press('ArrowLeft');
    assert.ok(await page.getByRole('radio', { name: 'Cam', exact: true }).isChecked());
    for (const width of [320, 390, 1280]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `No overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.theme-option').filter({ hasText: 'Tím' }).click();
    await page.reload();
    await page.getByRole('radio', { name: 'Tím', exact: true }).waitFor({ state: 'attached' });
    await page.waitForFunction(() => document.querySelector('input[value="purple"]')?.checked);
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'purple');
    await page.screenshot({ path: join(tmpdir(), 'tingting-theme-purple.png'), fullPage: true });
    await page.getByRole('link', { name: 'Ngân sách', exact: true }).click();
    await page.getByRole('button', { name: 'Đặt ngân sách', exact: true }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'purple');
    assert.equal(await page.locator('.budget-set-button').evaluate(el => getComputedStyle(el).color), 'rgb(112, 64, 175)');
    await page.getByRole('link', { name: 'Tôi', exact: true }).click();
    const other = await context.newPage();
    await other.goto(`${origin}/profile`);
    await other.getByRole('group', { name: 'Chọn màu giao diện' }).waitFor();
    await page.locator('.theme-option').filter({ hasText: 'Xanh lá' }).click();
    await other.waitForFunction(() => document.documentElement.dataset.theme === 'green');
    assert.ok(await other.getByRole('radio', { name: 'Xanh lá', exact: true }).isChecked());
    await page.evaluate(() => localStorage.clear());
    await other.waitForFunction(() => document.documentElement.dataset.theme === 'blue');
    await page.evaluate(key => localStorage.setItem(key, 'invalid-theme'), THEME_STORAGE_KEY);
    await page.reload();
    await page.getByRole('group', { name: 'Chọn màu giao diện' }).waitFor();
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'blue');
    assert.deepEqual(errors, [], 'No runtime or hydration errors');

    const denied = await browser.newContext({ serviceWorkers: 'block' });
    await denied.route('**/api/**', route => route.fulfill({ json: { user: null } }));
    await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage denied'); } }));
    const blocked = await denied.newPage();
    await blocked.goto(`${origin}/profile`);
    await blocked.locator('.theme-option').filter({ hasText: 'Tím' }).click();
    assert.ok(await blocked.getByRole('alert').filter({ hasText: 'Không lưu được màu giao diện' }).isVisible());
    assert.equal(await blocked.locator('html').getAttribute('data-theme'), 'blue');
    console.log('PASS: six palettes, keyboard selection, responsive layout, persistence, navigation, cross-tab sync, invalid values and denied storage; no database writes.');
} finally { await browser.close(); }
