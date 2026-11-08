// Keep the previous entrypoint while sharing the production offline regression suite.
process.env.TRANSACTION_TEST_ORIGIN ||= process.env.PWA_TEST_ORIGIN || 'http://127.0.0.1:3139';
await import('./pwa-offline.mjs');
