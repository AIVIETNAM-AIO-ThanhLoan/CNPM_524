import { api, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { postTransaction } from '@/app/lib/ledger';

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const id = await postTransaction((await requireUser()).id, body);
        return Response.json({ id }, { status: 201 });
    });
}
