import nextEnv from '@next/env';
import mysql from 'mysql2/promise';
import webpush from 'web-push';
import { pathToFileURL } from 'node:url';
import { databaseConfig } from '../database/config.mjs';
import { reminderJobs } from '../app/lib/notification-jobs.mjs';

export async function deliverPush(connection, send = webpush.sendNotification.bind(webpush)) {
    await connection.execute(`INSERT INTO push_deliveries (notification_id, subscription_id)
        SELECT n.id, s.id FROM notifications n JOIN push_subscriptions s ON s.user_id = n.user_id
        JOIN users u ON u.id = n.user_id AND u.blocked = FALSE
        WHERE n.read_at IS NULL AND n.created_at >= s.created_at AND n.created_at >= UTC_TIMESTAMP() - INTERVAL 7 DAY
        ON DUPLICATE KEY UPDATE notification_id = notification_id`);
    const [pending] = await connection.execute(`SELECT d.*, s.endpoint, s.p256dh, s.auth, n.user_id FROM push_deliveries d
        JOIN push_subscriptions s ON s.id = d.subscription_id JOIN notifications n ON n.id = d.notification_id
        JOIN users u ON u.id = n.user_id WHERE d.sent_at IS NULL AND d.attempts < 8 AND d.next_attempt_at <= UTC_TIMESTAMP()
        AND n.read_at IS NULL AND u.blocked = FALSE ORDER BY d.next_attempt_at LIMIT 100`);
    for (const item of pending) {
        // Persist the attempt before network I/O; a crashed worker retries after the backoff.
        const delay = Math.min(3600, 30 * 2 ** item.attempts);
        await connection.execute(`UPDATE push_deliveries SET attempts = attempts + 1, next_attempt_at = DATE_ADD(UTC_TIMESTAMP(), INTERVAL ? SECOND)
            WHERE notification_id = ? AND subscription_id = ?`, [delay, item.notification_id, item.subscription_id]);
        try {
            await send({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } },
                JSON.stringify({ id: item.notification_id, userId: item.user_id }),
                { TTL: 86400, timeout: 10000, topic: item.notification_id.replaceAll('-', '').slice(0, 32) });
            await connection.execute('UPDATE push_deliveries SET sent_at = UTC_TIMESTAMP(), last_error = NULL WHERE notification_id = ? AND subscription_id = ?', [item.notification_id, item.subscription_id]);
        } catch (error) {
            if ([404, 410].includes(error.statusCode)) await connection.execute('DELETE FROM push_subscriptions WHERE id = ?', [item.subscription_id]);
            else await connection.execute('UPDATE push_deliveries SET last_error = ? WHERE notification_id = ? AND subscription_id = ?',
                [String(error.statusCode || 'network').slice(0, 100), item.notification_id, item.subscription_id]);
        }
    }
}

export async function workerTick(connection, pushEnabled, send) {
    await connection.query("SET time_zone = '+00:00'");
    const [[lock]] = await connection.query("SELECT GET_LOCK(CONCAT(DATABASE(), ':reminders'), 0) AS acquired");
    if (Number(lock.acquired) !== 1) return false;
    try {
        await connection.beginTransaction();
        try { await reminderJobs(connection); await connection.commit(); }
        catch (error) { await connection.rollback(); throw error; }
        if (pushEnabled) await deliverPush(connection, send);
        return true;
    } finally { await connection.query("SELECT RELEASE_LOCK(CONCAT(DATABASE(), ':reminders'))"); }
}

async function main() {
    nextEnv.loadEnvConfig(process.cwd());
    const pushEnabled = Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
    if (pushEnabled) webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    else console.warn('Web Push is unconfigured; in-app reminders remain enabled.');
    let stopped = false;
    process.on('SIGINT', () => { stopped = true; });
    process.on('SIGTERM', () => { stopped = true; });
    do {
        let connection;
        try { connection = await mysql.createConnection(databaseConfig()); await workerTick(connection, pushEnabled); }
        catch (error) { console.error('Reminder worker failed:', error.code || error.name); if (process.argv.includes('--once')) process.exitCode = 1; }
        finally { await connection?.end(); }
        if (!stopped && !process.argv.includes('--once')) await new Promise((resolve) => setTimeout(resolve, 30000));
    } while (!stopped && !process.argv.includes('--once'));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
