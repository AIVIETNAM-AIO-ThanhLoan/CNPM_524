// Khôi phục database từ file sao lưu (UC20).
//   npm run db:restore -- --file backups/cnpm_524-....sql --target cnpm_524_restore_test [--replace]
//   npm run db:restore -- --file ... --target <DB_NAME đang dùng> --overwrite-main
// Kiểm tra file, checksum và dump đầy đủ trước khi chạy. Ghi đè database chính cần --overwrite-main,
// gõ lại tên database để xác nhận, và luôn sao lưu database chính trước khi ghi đè.
import { createReadStream } from 'node:fs';
import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { createInterface } from 'node:readline/promises';
import { backupDatabase } from './backup-database.mjs';
import { connect, findBinary, isCompleteDump, runTool, sha256File, toolConfig } from './db-tools.mjs';

function option(name) {
    const index = process.argv.indexOf(name);
    return index > 0 ? process.argv[index + 1] : undefined;
}

async function confirmMain(database) {
    if (!process.stdin.isTTY) throw new Error('Ghi đè database chính cần chạy trong terminal để xác nhận.');
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
        const answer = await rl.question(`Thao tác này GHI ĐÈ toàn bộ database ${database}. Gõ lại tên database để xác nhận: `);
        if (answer.trim() !== database) throw new Error('Tên database không khớp, đã hủy khôi phục.');
    } finally { rl.close(); }
}

async function verifyFile(file) {
    const info = await stat(file).catch(() => null);
    if (!info?.isFile()) throw new Error(`Không tìm thấy file ${file}.`);
    const line = await readFile(`${file}.sha256`, 'utf8').catch(() => '');
    const expected = line.trim().split(/\s+/)[0];
    if (!/^[a-f0-9]{64}$/.test(expected)) throw new Error(`Thiếu hoặc sai file checksum ${file}.sha256.`);
    const checksum = await sha256File(file);
    if (checksum !== expected) throw new Error('Checksum không khớp: file sao lưu đã bị thay đổi hoặc hỏng.');
    if (!await isCompleteDump(file)) throw new Error('File dump không đầy đủ.');
    return checksum;
}

// Số liệu để đối chiếu sau khôi phục: số bảng, bản ghi chính và sổ kép còn cân
async function summary(config, database) {
    const db = await connect(config, database);
    try {
        const [[tables]] = await db.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE()');
        const [[users]] = await db.query('SELECT COUNT(*) AS n FROM users');
        const [[transactions]] = await db.query('SELECT COUNT(*) AS n FROM transactions');
        const [[unbalanced]] = await db.query('SELECT COUNT(*) AS n FROM (SELECT transaction_id FROM transaction_entries GROUP BY transaction_id HAVING SUM(amount) <> 0) t');
        const [[migration]] = await db.query('SELECT MAX(version) AS version FROM schema_migrations');
        return { tables: tables.n, users: users.n, transactions: transactions.n, unbalancedTransactions: unbalanced.n, migration: migration.version };
    } finally { await db.end(); }
}

async function main() {
    const config = toolConfig();
    const file = option('--file') && path.resolve(option('--file'));
    const target = option('--target');
    if (!file || !target) throw new Error('Cách dùng: npm run db:restore -- --file <file.sql> --target <tên_database> [--replace | --overwrite-main]');
    if (!/^[a-zA-Z0-9_]+$/.test(target)) throw new Error('Tên database đích không hợp lệ.');
    const log = { time: new Date().toISOString(), file: path.relative(process.cwd(), file), target, status: 'failed' };
    try {
        log.checksum = await verifyFile(file);
        const admin = await connect(config);
        try {
            const [[existing]] = await admin.query('SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = ?', [target]);
            if (target === config.database) {
                if (!process.argv.includes('--overwrite-main')) throw new Error(`${target} là database chính. Thêm --overwrite-main nếu thật sự muốn ghi đè.`);
                await confirmMain(target);
                const before = await backupDatabase(config, 'manual');
                log.backupBeforeRestore = before.filePath;
                console.log(`Đã sao lưu database chính trước khi ghi đè: ${before.filePath}`);
            } else if (existing.n > 0 && !process.argv.includes('--replace')) {
                throw new Error(`Database ${target} đã có dữ liệu. Thêm --replace để ghi đè database thử nghiệm này.`);
            }
            if (existing.n > 0) await admin.query(`DROP DATABASE \`${target}\``);
            await admin.query(`CREATE DATABASE IF NOT EXISTS \`${target}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        } finally { await admin.end(); }
        const { code, stderr } = await runTool(findBinary('mysql'), ['--host', config.host, '--port', String(config.port), '--user', config.user,
            '--default-character-set=utf8mb4', target], config, createReadStream(file));
        if (code !== 0) throw new Error(`mysql thoát với mã ${code}. ${stderr.slice(0, 300)}`);
        log.summary = await summary(config, target);
        log.status = 'success';
        console.log(`Đã khôi phục ${log.file} vào ${target}.`, log.summary);
    } catch (error) {
        log.error = (error instanceof Error ? error.message : String(error)).slice(0, 500);
        throw error;
    } finally {
        await mkdir(config.backupDir, { recursive: true, mode: 0o700 });
        await appendFile(path.join(config.backupDir, 'restore.log'), `${JSON.stringify(log)}\n`, { mode: 0o600 });
    }
}

main().catch((error) => {
    console.error(`Khôi phục thất bại: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
});
