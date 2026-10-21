// Hàm dùng chung cho sao lưu/khôi phục: đọc cấu hình, tìm mysqldump/mysql, chạy lệnh và tính checksum.
import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import { open } from 'node:fs/promises';
import path from 'node:path';
import { databaseConfig } from '../database/config.mjs';

export function toolConfig() {
    nextEnv.loadEnvConfig(process.cwd());
    const config = databaseConfig();
    const user = process.env.DB_SETUP_USER;
    const password = process.env.DB_SETUP_PASSWORD;
    if (!user || password === undefined) throw new Error('Cần DB_SETUP_USER và DB_SETUP_PASSWORD trong .env.local.');
    const keep = Number(process.env.BACKUP_KEEP || 14);
    if (!Number.isInteger(keep) || keep < 0) throw new Error('BACKUP_KEEP phải là số nguyên không âm.');
    return { host: config.host, port: config.port, database: config.database, user, password, keep,
        backupDir: path.resolve(process.env.BACKUP_DIR || 'backups') };
}

const KNOWN_PATHS = {
    mysqldump: ['/Applications/XAMPP/xamppfiles/bin/mysqldump', 'C:\\xampp\\mysql\\bin\\mysqldump.exe', '/opt/lampp/bin/mysqldump'],
    mysql: ['/Applications/XAMPP/xamppfiles/bin/mysql', 'C:\\xampp\\mysql\\bin\\mysql.exe', '/opt/lampp/bin/mysql'],
};

// Ưu tiên biến môi trường, sau đó đường dẫn XAMPP thường gặp, cuối cùng là PATH
export function findBinary(name) {
    const fromEnv = process.env[name === 'mysqldump' ? 'MYSQLDUMP_PATH' : 'MYSQL_CLIENT_PATH'];
    if (fromEnv) return fromEnv;
    return KNOWN_PATHS[name].find((candidate) => existsSync(candidate)) ?? name;
}

// Mật khẩu truyền qua MYSQL_PWD thay vì tham số dòng lệnh để không lộ trong danh sách tiến trình
export function runTool(binary, args, config, input) {
    return new Promise((resolve, reject) => {
        const child = spawn(binary, args, { env: { ...process.env, MYSQL_PWD: config.password },
            stdio: [input ? 'pipe' : 'ignore', 'ignore', 'pipe'], windowsHide: true });
        let stderr = '';
        child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-2000); });
        child.on('error', (error) => reject(error.code === 'ENOENT'
            ? new Error(`Không tìm thấy ${binary}. Đặt MYSQLDUMP_PATH / MYSQL_CLIENT_PATH trong .env.local.`) : error));
        child.on('close', (code) => resolve({ code, stderr: stderr.trim() }));
        if (input) {
            input.on('error', (error) => { child.kill(); reject(error); });
            input.pipe(child.stdin);
        }
    });
}

export function connect(config, database) {
    return mysql.createConnection({ host: config.host, port: config.port, user: config.user, password: config.password,
        database, dateStrings: true, multipleStatements: false });
}

export async function sha256File(file) {
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(file)) hash.update(chunk);
    return hash.digest('hex');
}

// mysqldump chỉ ghi dòng "-- Dump completed" khi dump chạy hết; thiếu dòng này là file bị cắt dở
export async function isCompleteDump(file) {
    const handle = await open(file, 'r');
    try {
        const { size } = await handle.stat();
        const length = Math.min(size, 512);
        const buffer = Buffer.alloc(length);
        await handle.read(buffer, 0, length, size - length);
        return buffer.toString('utf8').includes('-- Dump completed');
    } finally { await handle.close(); }
}

export const isMain = (url) => process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(url).pathname);
