export const FINANCE_UPDATED = 'cnpm-finance-updated';

// Notify this page and other tabs without storing any financial data in the browser.
export function notifyFinanceUpdated(): void {
    window.dispatchEvent(new Event(FINANCE_UPDATED));
    try { localStorage.setItem(FINANCE_UPDATED, crypto.randomUUID()); }
    catch { /* Refresh on navigation/focus still works if browser storage is disabled. */ }
}
