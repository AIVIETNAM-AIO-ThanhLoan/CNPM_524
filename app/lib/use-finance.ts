'use client';

import { useEffect, useState } from 'react';
import { emptyFinance, type Finance, requestJson } from './client-api';
import { FINANCE_UPDATED } from './finance-updates';

export function useFinance(start: string, end: string, search = '', page = 1) {
    const url = `/api/finance?${new URLSearchParams({ start, end, q: search, page: String(page) })}`;
    const [result, setResult] = useState<{ url: string; data: Finance; error: string } | null>(null);
    useEffect(() => {
        let controller: AbortController | undefined;
        function refresh() {
            controller?.abort();
            const request = new AbortController();
            controller = request;
            requestJson<Finance>(url, undefined, request.signal)
                .then((data) => { if (!request.signal.aborted) setResult({ url, data, error: '' }); })
                .catch((error) => { if (!request.signal.aborted) setResult({ url, data: emptyFinance, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu.' }); });
        }
        const visible = () => { if (document.visibilityState === 'visible') refresh(); };
        const changedInAnotherTab = (event: StorageEvent) => { if (event.key === FINANCE_UPDATED) refresh(); };
        refresh();
        window.addEventListener(FINANCE_UPDATED, refresh);
        window.addEventListener('focus', refresh);
        window.addEventListener('pageshow', refresh);
        window.addEventListener('storage', changedInAnotherTab);
        document.addEventListener('visibilitychange', visible);
        return () => {
            controller?.abort();
            window.removeEventListener(FINANCE_UPDATED, refresh);
            window.removeEventListener('focus', refresh);
            window.removeEventListener('pageshow', refresh);
            window.removeEventListener('storage', changedInAnotherTab);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [url]);
    return { data: result?.url === url ? result.data : emptyFinance, error: result?.url === url ? result.error : '', loading: result?.url !== url };
}
