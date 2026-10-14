'use client';

import { useEffect, useState } from 'react';
import { emptyFinance, type Finance, requestJson } from './client-api';

export function useFinance(start: string, end: string, search = '') {
    const url = `/api/finance?${new URLSearchParams({ start, end, q: search })}`;
    const [result, setResult] = useState<{ url: string; data: Finance; error: string } | null>(null);
    useEffect(() => {
        const controller = new AbortController();
        requestJson<Finance>(url, undefined, controller.signal)
            .then((data) => { if (!controller.signal.aborted) setResult({ url, data, error: '' }); })
            .catch((error) => { if (!controller.signal.aborted) setResult({ url, data: emptyFinance, error: error instanceof Error ? error.message : 'Không thể tải dữ liệu.' }); });
        return () => controller.abort();
    }, [url]);
    return { data: result?.url === url ? result.data : emptyFinance, error: result?.url === url ? result.error : '', loading: result?.url !== url };
}
