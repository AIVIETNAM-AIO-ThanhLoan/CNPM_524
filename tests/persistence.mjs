import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain } from '../scripts/db-tools.mjs';
import { checkDatabase } from '../scripts/check-database.mjs';

export async function persistenceChecks({ api, admin, check, origin, cookie, cookieB, userId, env, suffix }) {
    const image = await readFile('tests/fixtures/vietqr.png');
    async function upload(url, { method = 'POST', session = cookie, data = image, requestOrigin = origin, status = 200 } = {}) {
        const response = await fetch(origin + url, { method, headers: { Origin: requestOrigin, 'Content-Type': 'image/png', ...(session ? { Cookie: session } : {}) }, body: data });
        assert.equal(response.status, status, await response.text()); check(true, `${method} ${url}: ${status}`);
    }
    await api('/api/avatar', { status: 401 });
    await api('/api/avatar', { cookie, status: 404 });
    await upload('/api/avatar', { session: '', status: 401 });
    await upload('/api/avatar', { requestOrigin: 'https://other.example', status: 403 });
    await upload('/api/avatar', { data: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), status: 415 });
    await upload('/api/avatar', { data: Buffer.alloc(2 * 1024 * 1024 + 1), status: 413 });
    await upload('/api/avatar');
    const avatar = await fetch(`${origin}/api/avatar?userId=ignored`, { headers: { Cookie: cookie } });
    assert.deepEqual(Buffer.from(await avatar.arrayBuffer()), image);
    check(avatar.headers.get('content-type') === 'image/png' && avatar.headers.get('cache-control') === 'no-store'
        && avatar.headers.get('x-content-type-options') === 'nosniff', 'Avatar returns original image privately with no caching');
    await upload('/api/avatar');
    const [[stored]] = await admin.execute('SELECT COUNT(*) AS n FROM user_avatars WHERE user_id = ?', [userId]);
    check(stored.n === 1, 'Replacing avatar keeps a single row per account');
    await api(`/api/avatar?userId=${userId}`, { cookie: cookieB, status: 404 });
    await api('/api/avatar', { cookie: cookieB, method: 'DELETE', body: {} });
    check((await fetch(`${origin}/api/avatar`, { headers: { Cookie: cookie } })).ok, 'Deleting another account avatar cannot affect the owner');
    await api('/api/avatar', { cookie, method: 'DELETE', body: {} });
    await api('/api/avatar', { cookie, status: 404 });
    await upload('/api/avatar');

    await api('/api/receive-qr', { status: 401 });
    const addQr = async (label) => {
        const response = await fetch(`${origin}/api/receive-qr?label=${encodeURIComponent(label)}`, { method: 'POST', headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'image/png' }, body: image });
        assert.equal(response.status, 201, await response.clone().text()); return (await response.json()).id;
    };
    const first = await addQr('QR thứ nhất'), second = await addQr('QR thứ hai');
    const images = (await api('/api/receive-qr', { cookie })).json.images;
    check(images.length === 2 && images[0].id === first && images[0].isPrimary, 'First QR image becomes primary and survives subsequent uploads');
    const qr = await fetch(`${origin}/api/receive-qr?id=${first}`, { headers: { Cookie: cookie } });
    assert.deepEqual(Buffer.from(await qr.arrayBuffer()), image); check(true, 'Stored QR image reads back unchanged');
    await api(`/api/receive-qr?id=${first}`, { cookie: cookieB, status: 404 });
    for (const method of ['PATCH', 'DELETE']) await api('/api/receive-qr', { cookie: cookieB, method, body: { id: first, primary: true }, status: 404 });
    await upload(`/api/receive-qr?id=${first}`, { method: 'PUT', session: cookieB, status: 404 });
    await api('/api/receive-qr', { cookie, method: 'PATCH', body: { id: second, primary: true, label: 'QR đổi tên' } });
    const primary = (await api('/api/receive-qr', { cookie })).json.images;
    check(primary[0].id === second && primary[0].label === 'QR đổi tên' && primary.filter((item) => item.isPrimary).length === 1, 'QR rename and primary change persist without duplicate primary images');
    await upload(`/api/receive-qr?id=${second}`, { method: 'PUT' });
    await api('/api/receive-qr', { cookie, method: 'DELETE', body: { id: second } });
    check((await api('/api/receive-qr', { cookie })).json.images[0].id === first, 'Deleting primary QR promotes the remaining image');
    for (let i = 0; i < 9; i++) await addQr(`QR giới hạn ${i}`);
    await upload('/api/receive-qr?label=overflow', { status: 400 });
    check((await api('/api/receive-qr', { cookie: cookieB })).json.images.length === 0, 'QR images remain account scoped');

    await api('/api/admin/rates', { status: 401 });
    await api('/api/admin/rates', { cookie: cookieB, status: 403 });
    await api('/api/admin/rates', { cookie: cookieB, body: {}, status: 403 });
    await api('/api/admin/rates', { cookie, body: {}, requestOrigin: 'https://other.example', status: 403 });
    await api('/api/admin/rates', { cookie, body: {} });
    const rates = (await api('/api/admin/rates', { cookie })).json.rates;
    check(rates.some((rate) => rate.base === 'USD' && rate.quote === 'VND' && Number(rate.rate) === 25000), 'Admin synchronization persists provider rates');
    await api('/api/admin/rates', { cookie, body: {} });
    check((await api('/api/admin/rates', { cookie })).json.rates.length === rates.length, 'Same-day synchronization updates existing rates instead of duplicating them');
    const gold = (await api('/api/market?type=gold')).json;
    check(gold.success === true && gold.prices.length === 3 && gold.prices.some((item) => item.brand === 'SJC' && item.buy === 150000000), 'Gold prices are mapped from the provider');
    check(gold.updatedAt === '09:30 - 05/11/2026', 'Gold prices show the update time reported by the provider');
    await api('/api/market?type=currency&from=BAD&to=VND', { status: 400 });
    await api('/api/market?type=currency&from=../USD', { status: 400 });

    const argv = process.argv[1];
    try {
        const cli = path.resolve('scripts/backup-database.mjs'); process.argv[1] = cli;
        check(isMain(pathToFileURL(cli).href), 'Backup entry detection handles Windows file URLs');
        check(!isMain(pathToFileURL(path.resolve('scripts/restore-database.mjs')).href), 'Importing backup from another CLI does not run it');
    } finally { process.argv[1] = argv; }
    const directory = await mkdtemp(path.join(tmpdir(), 'cnpm-audit-backup-'));
    const target = `cnpm_restore_${suffix}`;
    const cliEnv = { ...env, BACKUP_DIR: directory, BACKUP_KEEP: '0' };
    const run = (file, args = []) => spawnSync(process.execPath, [file, ...args], { env: cliEnv, encoding: 'utf8', timeout: 30000, windowsHide: true });
    try {
        const backup = run('scripts/backup-database.mjs'); assert.equal(backup.status, 0, backup.stderr);
        const files = (await readdir(directory)).filter((file) => file.endsWith('.sql'));
        check(files.length === 1, 'Backup CLI actually creates a dump');
        const file = path.join(directory, files[0]);
        const restored = run('scripts/restore-database.mjs', ['--file', file, '--target', target]); assert.equal(restored.status, 0, restored.stderr);
        const [[avatars]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${target}\`.user_avatars`);
        const [[qrImages]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${target}\`.receive_qr_images`);
        const [[original]] = await admin.query('SELECT COUNT(*) AS n FROM transactions');
        const [[restoredTransactions]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${target}\`.transactions`);
        check(avatars.n === 1 && qrImages.n === 10 && original.n === restoredTransactions.n, 'Restore preserves avatar/QR BLOBs and ledger rows in an isolated database');
        const config = { database: target, host: env.DB_HOST || '127.0.0.1', port: Number(env.DB_PORT || 3306), user: env.DB_SETUP_USER, password: env.DB_SETUP_PASSWORD };
        check((await checkDatabase(config)).problems.length === 0, 'Restored database passes schema, migration, trigger and ledger checks');
        await admin.query(`ALTER TABLE \`${target}\`.user_avatars DROP COLUMN updated_at`);
        check((await checkDatabase(config)).problems.includes('Missing column: user_avatars.updated_at'), 'Schema inspection detects missing columns despite applied migration records');
        await admin.query(`ALTER TABLE \`${target}\`.user_avatars ADD COLUMN updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
        const again = run('scripts/restore-database.mjs', ['--file', file, '--target', target]);
        check(again.status !== 0, 'Restore refuses to overwrite an existing populated database');
        await writeFile(file, '\n-- tampered\n', { flag: 'a' });
        const corrupt = run('scripts/restore-database.mjs', ['--file', file, '--target', target, '--replace']);
        check(corrupt.status !== 0, 'Restore rejects tampered backup before touching the target');
        const [[preserved]] = await admin.query(`SELECT COUNT(*) AS n FROM \`${target}\`.transactions`);
        check(preserved.n === original.n, 'Rejected restore preserves existing target data');
    } finally {
        assert.match(target, /^cnpm_restore_[a-f0-9]{12}$/);
        await admin.query(`DROP DATABASE IF EXISTS \`${target}\``);
        assert.equal(path.dirname(directory), path.resolve(tmpdir()));
        assert.match(path.basename(directory), /^cnpm-audit-backup-/);
        await rm(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 250 });
    }
}
