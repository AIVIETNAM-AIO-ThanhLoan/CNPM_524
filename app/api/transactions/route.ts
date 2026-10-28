import { api, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { postTransaction } from '@/app/lib/ledger';

export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        const user = await requireUser();
        if (body.expectedUserId !== undefined && body.expectedUserId !== user.id) return Response.json({ accountMismatch: true, error: 'Hãy đăng nhập đúng tài khoản đã ghi khoản chờ.' }, { status: 409 });
        const id = await postTransaction(user.id, body);
        return Response.json({ id }, { status: 201 });
    });
}
