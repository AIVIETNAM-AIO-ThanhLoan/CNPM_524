import History from './history-client';
import { today } from '../lib/client-api';

export default async function Page({
    searchParams,
}: {
    searchParams: Promise<{ q?: string | string[]; month?: string | string[] }>;
}) {
    const params = await searchParams;
    const query = typeof params.q === 'string' ? params.q.slice(0, 100) : '';
    // Tháng hợp lệ dạng YYYY-MM; mặc định là tháng hiện tại
    const month = typeof params.month === 'string' && /^\d{4}-\d{2}$/.test(params.month)
        ? params.month
        : today().slice(0, 7);
    return <History initialMonth={month} initialSearch={query} />;
}
