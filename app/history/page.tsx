import History from './history-client';
import { today } from '../lib/client-api';

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
    const query = (await searchParams).q;
    return <History initialDate={today()} initialSearch={typeof query === 'string' ? query.slice(0, 100) : ''} />;
}
