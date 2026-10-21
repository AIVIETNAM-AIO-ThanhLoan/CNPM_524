// Sao lưu database bằng mysqldump (UC19).
//   npm run db:backup                 sao lưu thủ công
//   npm run db:backup -- --scheduled  dùng trong cron/Task Scheduler, ghi trigger_type = 'schedule'
// Schema không dùng stored procedure nên không dump --routines (tránh lỗi mysql.proc cũ của XAMPP); trigger vẫn được dump.
// Kết quả: backups/<db>-YYYYMMDD-HHMMSS.sql và file .sha256 cạnh nó; mỗi lần chạy (kể cả lỗi) ghi vào bảng backup_runs.
import { chmod, mkdir, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { connect, findBinary, isCompleteDump, isMain, runTool, sha256File, toolConfig } from './db-tools.mjs';

async function record(config, run) {
    const db = await connect(config, config.database);
    try {
        await db.execute(`INSERT INTO backup_runs (trigger_type, status, started_at, finished_at, file_path, size_bytes, checksum, error)
            VALUES (?, ?, ?, UTC_TIMESTAMP(), ?, ?, ?, ?)`,
            [run.triggerType, run.status, run.startedAt, run.filePath ?? null, run.size ?? null, run.checksum ?? null, run.error ?? null]);
    } finally { await db.end(); }
}

// Giữ lại BACKUP_KEEP bản mới nhất; chỉ xóa file đúng mẫu tên do script này tạo
async function prune(config) {
    if (!config.keep) return;
    const pattern = new RegExp(`^${config.database}-\\d{8}-\\d{6}\\.sql$`);
    const files = (await readdir(config.backupDir)).filter((name) => pattern.test(name)).sort().reverse();
    for (const name of files.slice(config.keep)) {
        await rm(path.join(config.backupDir, name), { force: true });
        await rm(path.join(config.backupDir, `${name}.sha256`), { force: true });
    }
}

export async function backupDatabase(config, triggerType = 'manual') {
    const startedAt = new Date();
    const stamp = startedAt.toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
    const name = `${config.database}-${stamp}.sql`;
    const file = path.join(config.backupDir, name);
    const partial = `${file}.partial`;
    const filePath = path.relative(process.cwd(), file);
    try {
        await mkdir(config.backupDir, { recursive: true, mode: 0o700 });
        const { code, stderr } = await runTool(findBinary('mysqldump'), ['--host', config.host, '--port', String(config.port),
            '--user', config.user, '--single-transaction', '--triggers', '--hex-blob',
            '--default-character-set=utf8mb4', `--result-file=${partial}`, config.database], config);
        if (code !== 0) throw new Error(`mysqldump thoát với mã ${code}. ${stderr.slice(0, 300)}`);
        if (!await isCompleteDump(partial)) throw new Error('File dump không đầy đủ.');
        await rename(partial, file);
        await chmod(file, 0o600);
        const checksum = await sha256File(file);
        const { size } = await stat(file);
        await writeFile(`${file}.sha256`, `${checksum}  ${name}\n`, { mode: 0o600 });
        await record(config, { triggerType, status: 'success', startedAt, filePath, size, checksum });
        await prune(config);
        return { file, filePath, size, checksum };
    } catch (error) {
        // Không để lại file dở dang và không báo thành công khi dump lỗi
        await rm(partial, { force: true });
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 500);
        await record(config, { triggerType, status: 'failed', startedAt, error: message }).catch(() => undefined);
        throw new Error(message);
    }
}

if (isMain(import.meta.url)) {
    try {
        const config = toolConfig();
        const result = await backupDatabase(config, process.argv.includes('--scheduled') ? 'schedule' : 'manual');
        console.log(`Đã sao lưu ${config.database}: ${result.filePath} (${result.size} byte, SHA-256 ${result.checksum}).`);
    } catch (error) {
        console.error(`Sao lưu thất bại: ${error instanceof Error ? error.message : error}`);
        process.exitCode = 1;
    }
}
