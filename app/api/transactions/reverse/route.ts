import { api, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { reverseTransaction } from '@/app/lib/ledger';

export async function POST(request: Request) {
    return api(async () => Response.json(await reverseTransaction((await requireUser()).id, await jsonBody(request)), { status: 201 }));
}
