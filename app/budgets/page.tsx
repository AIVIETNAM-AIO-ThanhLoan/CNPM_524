import { connection } from 'next/server';
import { today } from '../lib/client-api';
import Budgets from './budgets-client';

export default async function Page() {
    await connection();
    return <Budgets initialMonth={today().slice(0, 7)} />;
}
