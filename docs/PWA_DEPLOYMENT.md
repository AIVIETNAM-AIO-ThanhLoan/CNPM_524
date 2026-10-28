# Core features, deployment and PWA verification

## Data and user flows

- Wallets and categories: **Tôi → Quản lý ví và danh mục**. Add, rename, archive and restore. Archiving preserves records. A wallet must have a zero balance; enabled recurring rules must be paused or updated before archiving their wallet/category. Archived categories with an existing monthly budget remain visible in that month's budget screen.
- History: 200 entries per page, with stable date/creation/ID ordering. Totals cover the full requested period. **Hủy / điều chỉnh** requires a reason. The original stays intact; a balanced reversal uses its original booking date. Corrections atomically add a replacement with the selected date. Reports subtract reversal amounts. Reversals cannot themselves be reversed; a replacement can be corrected again.
- Budgets: one expense-category limit per month. Usage includes reversals and remains monthly when the homepage shows a single day. Alerts are generated at exactly 80% and 100%, once per category/month/threshold. An alert remains historical after a later correction reduces spending; changing a limit does not reset its deduplication key.
- Goals: manually recorded contributions only; they never move money or change wallet balances. Review contribution history, mark complete/closed, or reopen. Existing legacy goal ledger balances are retained and included in progress; no new wallet-to-goal posting path is introduced.
- Recurring payments: **Lời nhắc** supports weekly, monthly and yearly rules, editing and pause/resume. Monthly/yearly schedules retain the original day across short months and leap years. Each due period needs **Xác nhận đã thanh toán** before a normal VND expense is posted. Missed periods require separate confirmations. The worker never creates ledger transactions. Canceling a confirmed transaction does not reopen its paid period; correct it through History if needed.
- Notifications and read status are stored per account. The home badge shows the server's unread count; the latest 200 notifications are listed, and **Đọc tất cả** covers all unread records.
- Currency conversion keeps the existing live-rate/manual-rate implementation and per-account history. Provider failures, missing rates and invalid numbers are reported. History results are recalculated on the server from the amount and selected rate. Conversion never changes ledger balances; all ledger records remain VND.
- **Quét VietQR** requires login and connectivity. The camera decoder validates TLV structure, the NAPAS identifier, CRC, currency, bank BIN and account number. This version supports account-transfer QR (`QRIBFTTA`); card-transfer and merchant-payment payloads are rejected. Static QR amounts can be entered manually. Review recipient, amount, note and bank app before creating/opening the link. A name embedded in a QR is unverified. Always check the bank app's resolved recipient name.

The bank/app list and platform-specific autofill flag come from [VietQR Deep Link](https://www.vietqr.io/deeplink). Some apps only open; autofill depends on the app, operating system and provider. Returning to `/scan` is not proof of payment. Opening or returning from the bank app never records a transaction.

## Setup and upgrades

Use Node.js 20.9+ supported by the installed Next.js release, MySQL 8+ or MariaDB 10.4+, and a separate application database user. Keep existing `.env.local` values when upgrading. Next.js and its ESLint configuration are pinned to 16.4.3; the lockfile also updates the vulnerable transitive Zod version.

```powershell
npm ci
# First installation only:
Copy-Item .env.example .env.local
# Set a unique DB_PASSWORD and the correct DB_SETUP_* credentials.
npm run db:setup
npm run build
npm run start
```

The new migration is `012-core-pwa.sql`; migration 011 is the existing manual-contribution implementation. Earlier migrations and records are preserved. Migration 012 adds archive flags, recurring metadata/payment confirmations, notifications, subscriptions and delivery retries. Back up an existing database before deployment with `npm run db:backup`. MySQL DDL commits independently; if an interrupted migration partially applies, inspect and complete its remaining statements before recording its checksum. Do not delete existing tables or edit the checksums of applied migrations to force setup through.

Application and worker database connections explicitly set SQL session time to UTC. Reminder dates are calculated separately in `Asia/Ho_Chi_Minh` (UTC+7).

## HTTPS and Web Push

Serve the app through an HTTPS reverse proxy and set:

```dotenv
APP_ORIGIN=https://your-domain.example
COOKIE_SECURE=true
VAPID_PUBLIC_KEY=<generated-public-key>
VAPID_PRIVATE_KEY=<generated-private-key>
VAPID_SUBJECT=mailto:your-real-contact@example.com
```

Generate keys once with `npx web-push generate-vapid-keys --json`. Use the same pair in both processes, keep the private key on the server, and keep it out of Git and browser bundles. Rotating the public key requires device resubscription. Do not use the example mail address as your deployment contact. Web Push uses the [web-push library](https://github.com/web-push-libs/web-push).

Run **two persistent processes** from the project directory:

```text
npm run start
npm run worker
```

`next start` alone does not run reminders. The worker polls every 30 seconds, continues through transient database errors, and reconnects each cycle. Without all three VAPID values it still creates in-app reminders, but does not send Web Push. It must run on a persistent server/container, not only in a short-lived serverless request handler. A one-shot diagnostic is `npm run worker -- --once`.

Example Linux systemd worker service (adjust user, paths and Node location):

```ini
[Unit]
Description=Ting Ting reminder and Web Push worker
After=network-online.target

[Service]
User=tingting
WorkingDirectory=/srv/tingting
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/tingting/scripts/push-worker.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Run the web process under your usual process supervisor as well. On Windows, use a service manager or Task Scheduler at startup: run `node.exe` with `scripts/push-worker.mjs`, set **Start in** to the repository directory, allow execution without an interactive login, and configure restart on failure. Keep secrets readable only by the service account.

The database advisory lock prevents simultaneous workers from sending the same batch. Delivery identity is `(notification_id, subscription_id)`. Attempts are recorded before sending; transient failures retry after 30, 60, 120… seconds, capped at one hour, up to eight attempts. HTTP 404/410 removes dead subscriptions. Successful sends are not repeated. Push topics, notification tags and a persistent device-side seen store protect against duplicates if a response is lost. Delivery is not a payment receipt and cannot provide an external exactly-once guarantee.

The push payload contains only notification/account identifiers. The service worker checks the current session before displaying a generic notice. It suppresses delivery to a different or expired session; in-app notifications remain available after login. Logout removes the current device's subscription when supplied and unsubscribes the browser. Other devices are unaffected. Monitor worker logs and terminal failures:

```sql
SELECT notification_id, subscription_id, attempts, next_attempt_at, last_error
FROM push_deliveries WHERE sent_at IS NULL AND attempts >= 8;
```

Only supported browser push-service HTTPS hosts are accepted as endpoints. Adding a new push provider requires reviewing and extending that allowlist.

## Offline behavior

Open and sign in online once; allow the service worker to finish preparing `/offline`. The manifest supplies 192px, 512px and maskable PNG icons. Chrome/Edge can offer installation; on iOS use Safari's **Add to Home Screen**. Camera and Web Push need a secure context; HTTP localhost is a development exception. A phone opening a desktop's LAN HTTP address is not that exception. iOS Web Push requires a compatible installed home-screen web app and permission granted by a user action.

The service worker caches only the public offline form and static assets, never account APIs or personalized HTML. Offline navigation opens that form. IndexedDB stores wallet/category snapshots and outbox entries separately per account. An entry is persisted before any submission. The same UUID request key is reused after timeouts, reloads, session expiry and retries. Server-side ownership checks and `expectedUserId` prevent synchronization under a switched account. Synchronization runs on open, focus, reconnection and periodic checks while open; execution after closing the app depends on the browser and is not required by this implementation.

**Chờ đồng bộ** means an entry is retained, including ambiguous responses where the server may already have committed it. **Gửi thất bại** means the server definitively rejected it; retry or explicitly delete that failed entry and enter a corrected one. HTTP 401 and server/network failures leave the entry pending. Use **Ghi khoản khác** to start another entry after saving locally. Logging out with pending/failed entries requires acknowledging that they remain on the device. Dismissing the warning keeps the session. The outbox is never automatically erased on logout or account switching.

Browser storage is local, unencrypted application data. Clearing site data, using another browser profile or storage eviction can remove unsent entries. Avoid shared browser profiles and do not clear site data while entries remain. This is not a cross-device offline backup. After a deployment changes the cached offline shell/assets, update the `CACHE` version in `public/sw.js` and deploy the worker with the new build so installed clients refresh the shell.

## Automated checks

```powershell
npm run lint
npm run build
npm run test:integration
npm run test:browser
```

Both integration commands require `DB_SETUP_USER` and `DB_SETUP_PASSWORD` (including an explicit empty value for a local empty root password). They create only randomly named disposable databases/users and clean those resources afterward. The suite validates a fresh schema, seeds a separate schema through migration 011 with populated records, applies 012, compares all prior columns across 14 tables, and reruns setup safely.

`test:browser` builds and starts a separate production instance, then runs Edge on Windows or Chromium elsewhere. Install Chromium with `npx playwright install chromium` if needed. Rates and VietQR directory responses use deterministic upstream fixtures loaded only in the disposable server; no paid bank transaction or real push send occurs. Push retry tests inject a sender; browser subscription tests simulate the subscription object. The camera test feeds a synthetic stream containing `tests/fixtures/vietqr.png` through the actual decoder. Screenshots are written to the system temporary directory.

Coverage includes isolation, balanced entries, cancellation/correction rollback and replay, concurrent duplicates, history pagination, exact budget thresholds/read status, manual goals, confirmation-only recurring payments, month-end/leap anchors, currency/provider errors, manifest/assets, offline navigation/reload/reconnect, lost responses, visible failures, expired sessions, account switching, pending logout, push permission/subscription handling, push deduplication, QR validation/review/connectivity and generated deep-link parameters.

## Physical-device acceptance

These checks require a compatible device, configured HTTPS/VAPID keys and the running worker; automation does not substitute for them:

1. Install on Android Chrome/Edge and iOS Safari. Reopen from the home screen and confirm standalone layout and icons.
2. Sign in online, enable airplane mode, record an expense and reload/reopen. Confirm wallets/categories and the pending entry survive. Reconnect and verify exactly one ledger record with the original request key.
3. Expire the session or switch accounts before reconnecting. Verify the old account's queue stays unsent, then resumes after the correct login. Test both dismissing and accepting the pending-entry logout warning.
4. Deny and later grant notification permission. Create a due recurring payment, close the app and keep the server worker running. Verify the device receives a generic push once, opens Notifications on tap, and respects account switching and logout. Repeat with an unavailable endpoint/network and inspect retries.
5. Use the rear camera with real static/dynamic VietQR account codes. Check permission denial, malformed/foreign-currency codes and lost connectivity. Select apps with and without autofill support on each OS; verify recipient/amount/note inside the bank app. Return without paying and confirm no transaction exists; even after real payment, record it manually.

Google login, multicurrency ledger entries, additional admin features and live gold prices remain outside this scope.
