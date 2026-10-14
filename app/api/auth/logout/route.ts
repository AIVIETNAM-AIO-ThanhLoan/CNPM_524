import { api, jsonBody } from '@/app/lib/http';
import { destroySession } from '@/app/lib/session';

export async function POST(request: Request) {
    return api(async () => {
        await jsonBody(request);
        await destroySession();
        return Response.json({ message: 'Đã đăng xuất.' });
    });
}
