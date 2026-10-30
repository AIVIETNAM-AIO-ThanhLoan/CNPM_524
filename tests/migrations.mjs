import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { databaseUserHost } from '../database/config.mjs';

export async function migrationUpgrade({ admin, env, suffix, setup, check }) {
    const name = `cnpm_upgrade_${suffix}`;
    const user = `cnpm_u_${suffix}`;
    assert.match(name, /^cnpm_upgrade_[a-f0-9]{12}$/);
    assert.match(user, /^cnpm_u_[a-f0-9]{12}$/);
    const tables = ['users', 'sessions', 'accounts', 'categories', 'transactions', 'transaction_entries', 'budgets', 'goals', 'recurring_transactions', 'exchange_rates', 'exchange_history', 'goal_contributions', 'budget_alerts', 'reminder_deliveries'];
    try {
        await admin.query(`CREATE DATABASE \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
        await admin.query(`CREATE TABLE \`${name}\`.schema_migrations (version VARCHAR(100) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB`);
        const files = ['schema.sql', ...(await readdir('database/migrations')).filter((file) => /^0(0[2-9]|1[01])-.*\.sql$/.test(file)).sort().map((file) => `migrations/${file}`)];
        await admin.changeUser({ database: name });
        await admin.query("SET time_zone = '+00:00'");
        for (const file of files) {
            const sql = await readFile(`database/${file}`, 'utf8');
            for (const statement of sql.replace(/^\s*--.*$/gm, '').split(';').filter((value) => value.trim())) await admin.query(statement);
            const version = file === 'schema.sql' ? '001_initial' : file.split('/').at(-1).replace('.sql', '').replaceAll('-', '_');
            await admin.execute('INSERT INTO schema_migrations (version, checksum) VALUES (?, ?)', [version, createHash('sha256').update(sql).digest('hex')]);
        }
        const snapshots = [];
        for (const table of tables) {
            const [columns] = await admin.query(`SHOW COLUMNS FROM \`${name}\`.\`${table}\``);
            const names = columns.map((column) => `\`${column.Field}\``).join(',');
            const insert = `INSERT INTO \`${name}\`.\`${table}\` (${names}) SELECT ${names} FROM \`${env.DB_NAME}\`.\`${table}\``;
            if (table === 'transactions') {
                await admin.query(`${insert} WHERE reverses_id IS NULL AND replaces_id IS NULL`);
                await admin.query(`${insert} WHERE replaces_id IS NOT NULL`);
                await admin.query(`${insert} WHERE reverses_id IS NOT NULL`);
            } else await admin.query(insert);
            const [rows] = await admin.query(`SELECT ${names} FROM \`${name}\`.\`${table}\``);
            snapshots.push({ table, names, data: rows.map((row) => JSON.stringify(row)).sort() });
        }
        const [[before]] = await admin.query('SELECT COUNT(*) AS n FROM transactions');
        check(before.n > 200, 'Upgrade fixture contains existing users, wallets, ledger entries, goals, contributions, budgets and reminders');
        setup({ DB_NAME: name, DB_USER: user });
        for (const { table, names, data } of snapshots) {
            const [after] = await admin.query(`SELECT ${names} FROM \`${name}\`.\`${table}\``);
            assert.deepEqual(after.map((row) => JSON.stringify(row)).sort(), data, `Upgrade preserves every existing column in ${table}`);
        }
        check(true, 'Migration 012 preserves all populated rows and prior column values across 14 existing tables');
        const [[migrated]] = await admin.query("SELECT COUNT(*) AS n FROM schema_migrations WHERE version = '012_core_pwa'");
        check(migrated.n === 1, 'Existing database advances from migration 011 to 012');
        setup({ DB_NAME: name, DB_USER: user });
        check(true, 'Populated upgraded database supports another safe setup run');
    } finally {
        await admin.changeUser({ database: env.DB_NAME });
        await admin.query("SET time_zone = '+00:00'");
        await admin.query(`DROP DATABASE IF EXISTS \`${name}\``);
        await admin.query('DROP USER IF EXISTS ?@?', [user, databaseUserHost(env)]);
    }
}
