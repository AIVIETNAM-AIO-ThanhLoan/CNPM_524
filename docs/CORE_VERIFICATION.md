# Core features and PWA verification

Verified on 2026-10-28 (Vietnam time), using Node.js 24.21.0, Next.js 16.4.3, MariaDB 10.4.32 and installed Microsoft Edge on Windows.

| Check | Result |
| --- | --- |
| `npm run lint` | Passed: zero errors; three existing warnings in `app/api/market/route.ts` and `app/components/AvatarUpload.tsx` |
| `npm run build` | Passed: production compilation, TypeScript and page generation |
| `npm run test:integration` | Passed: 449 checks |
| `npm run test:browser` | Passed: 522 combined integration/browser checks against a separate production build |
| `npm audit` | Zero reported vulnerabilities after dependency updates |
| `git diff --check` | Passed |
| Live currency provider | HTTP 200, successful response and a finite positive USD-to-VND rate |
| Live VietQR directories | HTTP 200 for bank and iOS app lists; expected account-bank and autofill fields present |

Database checks used disposable databases on a separate temporary MariaDB instance. The existing local MariaDB connection reset during the initial attempt; its data was not repaired, replaced or migrated. The tests first applied all migrations to a fresh schema. A second schema was built through migration 011 and populated with existing users, wallets, categories, balanced transactions, budgets, goals, contributions and recurring records. Applying migration 012 preserved every prior column value across 14 populated tables; rerunning setup also succeeded.

The suite verifies account isolation, balanced reversals, atomic correction rollback, concurrent idempotent submissions, pagination, exact 80%/100% alerts, persisted read status, goal contributions without wallet changes, confirmation-only recurring payments, month-end/leap-year anchors, push backoff and dead endpoints, and currency/provider error handling.

Production-browser checks cover installation criteria through Chromium's `Page.getInstallabilityErrors` in a temporary normal browser profile, manifest icons, a public-only service-worker cache, offline navigation/reload, original-key synchronization after reconnection, lost responses, failed entries, expired sessions, account switching, pending-entry logout cancellation/retention, notification permission/subscription handling and push-event deduplication. QR checks cover validation, recipient review, bank-app selection, deep-link parameters, connectivity loss, mobile layout and actual decoding of a synthetic camera stream. Offline and QR review screenshots were also visually inspected.

External-service success/error contracts in automated tests are deterministic fixtures. Retry tests use an injected push sender; browser subscription tests simulate the subscription object. No bank app was opened and no payment was initiated. Camera decoding used a synthetic QR video stream rather than physical camera hardware.

Physical-phone installation, background Web Push reception, real camera conditions and bank-specific autofill remain unverified because compatible physical devices were not available to this session. They require deployed HTTPS, configured VAPID keys and a running server worker. Follow [deployment and physical-device acceptance instructions](PWA_DEPLOYMENT.md) before claiming those device-dependent checks passed.

The application's existing database still needs a normal backed-up deployment upgrade with `npm run db:setup`. Start both the web server and `npm run worker`; only the test databases were migrated during verification.

The temporary MariaDB server was stopped after testing. Automatic approval review blocked recursive cleanup with "blocked by policy", so its generated data directory was retained at `C:\Users\anh\AppData\Local\Temp\cnpm-core-db-ebb11161622c4d628d1a32a3dd42b9ff`.
