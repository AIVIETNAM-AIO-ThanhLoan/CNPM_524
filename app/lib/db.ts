import 'server-only';
import mysql, { type Pool, type PoolConnection, type RowDataPacket } from 'mysql2/promise';
import { databaseConfig } from '../../database/config.mjs';

const globalDatabase = globalThis as typeof globalThis & { cnpmPool?: Pool };
export function database(): Pool {
    if (!globalDatabase.cnpmPool) {
        globalDatabase.cnpmPool = mysql.createPool({ ...databaseConfig(), connectionLimit: 10,
            waitForConnections: true, queueLimit: 50 });
    }
    return globalDatabase.cnpmPool;
}

export async function rows<T extends RowDataPacket>(sql: string, values: (string | number | null)[] = []): Promise<T[]> {
    const [result] = await database().execute<T[]>(sql, values);
    return result;
}

export async function atomic<T>(work: (connection: PoolConnection) => Promise<T>): Promise<T> {
    const connection = await database().getConnection();
    try {
        await connection.beginTransaction();
        const result = await work(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally { connection.release(); }
}
