import { connection } from 'next/server';
import Home from '../home-client';
import { today } from '../lib/client-api';

export default async function Page() {
    await connection();
    return <Home initialDate={today()} />;
}
