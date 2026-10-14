import { randomUUID } from 'node:crypto';
import { database } from '@/app/lib/db';
import { api, jsonBody, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { wallets } from '@/app/lib/ledger';

export async function GET() {
    return api(async () => Response.json({ wallets: await wallets((await requireUser()).id) }));
}

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        const id = randomUUID();
        const name = text(body.name, 'Tên ví', 100);
        await database().execute("INSERT INTO accounts (id, user_id, name, kind) VALUES (?, ?, ?, 'wallet')", [id, user.id, name]);
        return Response.json({ id }, { status: 201 });
    });
}
