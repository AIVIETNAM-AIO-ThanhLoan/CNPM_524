import assert from 'node:assert/strict';
import path from 'node:path';
import { tmpdir } from 'node:os';

export async function adminBrowserChecks({ page, origin, admin, check }) {
    const user = (await (await page.request.get(`${origin}/api/auth/me`)).json()).user;
    await admin.execute("UPDATE users SET role = 'admin' WHERE id = ?", [user.id]);
    try {
        await page.goto(`${origin}/admin`);
        await page.getByRole('heading', { name: 'Quản trị Ting Ting', exact: true }).waitFor();
        const [[counts]] = await admin.query('SELECT COUNT(*) AS n FROM users');
        const usersCard = page.getByRole('heading', { name: 'Tổng người dùng', exact: true }).locator('..');
        await page.waitForFunction((n) => [...document.querySelectorAll('section')].some((section) => section.querySelector('h2')?.textContent === 'Tổng người dùng' && section.querySelector('p')?.textContent === n), String(counts.n));
        assert.equal(await usersCard.locator('p').textContent(), String(counts.n)); check(true, 'Admin overview displays real database counts');
        await page.getByRole('button', { name: 'Quản lý Người dùng', exact: true }).click();
        await page.getByRole('textbox', { name: 'Tìm người dùng' }).fill('core-b@example.com');
        await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
        const row = page.getByRole('row').filter({ hasText: 'core-b@example.com' });
        await row.waitFor();
        await row.getByRole('button', { name: 'Khóa', exact: true }).click();
        await row.getByText('Đã khóa', { exact: true }).waitFor();
        const [[blocked]] = await admin.query("SELECT blocked FROM users WHERE account = 'core-b@example.com'");
        check(Boolean(blocked.blocked), 'Admin blocking action persists to database');
        await row.getByRole('button', { name: 'Mở khóa', exact: true }).click();
        await row.getByText('Đang hoạt động', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Quản lý Tỷ giá', exact: true }).click();
        await page.getByRole('button', { name: 'Đồng bộ tỷ giá ngay', exact: true }).click();
        await page.getByRole('status').filter({ hasText: 'Đã lưu' }).waitFor();
        await page.getByRole('cell', { name: 'USD / VND', exact: true }).waitFor();
        check(true, 'Admin rate synchronization displays persisted rates');
        await page.getByRole('button', { name: 'Sao lưu & Khôi phục', exact: true }).click();
        await page.getByRole('cell', { name: 'Thành công', exact: true }).first().waitFor();
        check(await page.getByRole('button', { name: 'Tạo bản sao lưu ngay', exact: true }).count() === 0, 'Backup screen uses real history without fake success actions');
        for (const width of [320, 390, 1280]) {
            await page.setViewportSize({ width, height: 900 });
            check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)), `Admin fits ${width}px`);
        }
        await page.screenshot({ path: path.join(tmpdir(), 'cnpm-admin-audit.png'), fullPage: true });
    } finally { await admin.execute("UPDATE users SET role = 'user' WHERE id = ?", [user.id]); }
}
