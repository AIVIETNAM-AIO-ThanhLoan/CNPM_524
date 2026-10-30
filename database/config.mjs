export function databaseUserHost(env = process.env) {
    const host = env.DB_USER_HOST ?? '127.0.0.1';
    if (!['127.0.0.1', '%'].includes(host)) {
        throw new Error('DB_USER_HOST must be 127.0.0.1 (local) or % (Docker network).');
    }
    return host;
}

export function databaseConfig(env = process.env) {
    const database = env.DB_NAME || 'cnpm_524';
    const user = env.DB_USER || '';
    const password = env.DB_PASSWORD || '';
    const port = Number(env.DB_PORT || 3306);
    if (!/^[a-zA-Z0-9_]+$/.test(database) || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_NAME hoặc DB_PORT không hợp lệ.');
    }
    if (!user || user.toLowerCase() === 'root' || !password || password === 'CHANGE_ME') {
        throw new Error('Cần DB_USER riêng (không phải root) và DB_PASSWORD trong .env.local.');
    }
    return { host: env.DB_HOST || '127.0.0.1', port, database, user, password,
        charset: 'utf8mb4', timezone: 'Z', dateStrings: true, multipleStatements: false };
}
