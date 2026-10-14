import { connection } from 'next/server';
import Reports from './reports-client';
import { today } from '../lib/client-api';

export default async function Page() {
    await connection();
    return <Reports initialDate={today()} />;
}
