import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { connect, isMain, toolConfig } from './db-tools.mjs';
import { MIGRATIONS } from './database-migrations.mjs';

// Read-only inspection: do not infer schema health from migration rows alone.
export async function checkDatabase(config) {
    const db = await connect(config, config.database);
    try {
        const problems = [];
        const [columns] = await db.execute('SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?', [config.database]);
        const actual = new Set(columns.map((column) => `${column.TABLE_NAME}.${column.COLUMN_NAME}`));
        if (!actual.has('schema_migrations.version')) return { database: config.database, problems: ['Missing schema_migrations table. Run db:setup for a new database.'] };
        const [applied] = await db.query('SELECT version, checksum FROM schema_migrations');
        const expectedTables = new Set();
        const triggers = new Set();
        for (const [version, file] of MIGRATIONS) {
            const sql = await readFile(new URL(file, import.meta.url), 'utf8');
            const migration = applied.find((entry) => entry.version === version);
            if (!migration) problems.push(`Missing migration: ${version}`);
            else if (migration.checksum !== createHash('sha256').update(sql).digest('hex')) problems.push(`Checksum mismatch: ${version}`);
            const clean = sql.replace(/^\s*--.*$/gm, '');
            for (const match of clean.matchAll(/CREATE TABLE\s+(\w+)\s*\(([\s\S]*?)\)\s*ENGINE/gi)) {
                const [, table, body] = match;
                expectedTables.add(table);
                const required = [...body.matchAll(/^\s*(\w+)\s+(?:CHAR|VARCHAR|TEXT|MEDIUMTEXT|MEDIUMBLOB|INT|BIGINT|TINYINT|DECIMAL|DATE|TIMESTAMP|ENUM|BOOLEAN)\b/gim)].map((column) => column[1]);
                for (const column of required) if (!actual.has(`${table}.${column}`)) problems.push(`Missing column: ${table}.${column}`);
            }
            for (const match of clean.matchAll(/ALTER TABLE\s+(\w+)\s+([^;]+)/gi)) {
                for (const column of match[2].matchAll(/ADD COLUMN\s+(\w+)/gi)) if (!actual.has(`${match[1]}.${column[1]}`)) problems.push(`Missing column: ${match[1]}.${column[1]}`);
            }
            for (const match of clean.matchAll(/CREATE TRIGGER\s+(\w+)/gi)) triggers.add(match[1]);
        }
        const [installedTriggers] = await db.execute('SELECT TRIGGER_NAME FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = ?', [config.database]);
        for (const trigger of triggers) if (!installedTriggers.some((row) => row.TRIGGER_NAME === trigger)) problems.push(`Missing trigger: ${trigger}`);
        let unbalancedTransactions = null;
        if (['transactions.id', 'transaction_entries.id', 'transaction_entries.amount', 'transaction_entries.user_id', 'transaction_entries.transaction_id'].every((column) => actual.has(column))) {
            const [[ledger]] = await db.query(`SELECT COUNT(*) AS n FROM (SELECT t.id FROM transactions t
                LEFT JOIN transaction_entries e ON e.transaction_id = t.id AND e.user_id = t.user_id
                GROUP BY t.id HAVING COUNT(e.id) <> 2 OR COALESCE(SUM(e.amount), 0) <> 0) invalid`);
            unbalancedTransactions = ledger.n;
            if (ledger.n) problems.push(`${ledger.n} transaction(s) have missing entries or an unbalanced ledger.`);
        }
        return { database: config.database, migrations: MIGRATIONS.length, tables: expectedTables.size, unbalancedTransactions, problems };
    } finally { await db.end(); }
}

if (isMain(import.meta.url)) {
    try {
        const report = await checkDatabase(toolConfig());
        console.log(JSON.stringify(report, null, 2));
        process.exitCode = report.problems.length ? 1 : 0;
    } catch (error) {
        console.error('Database check failed:', error.code || error.name);
        process.exitCode = 1;
    }
}
