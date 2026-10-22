import { api, jsonBody } from '@/app/lib/http';
import { codeInput, completeChallenge } from '@/app/lib/two-factor';

export const runtime = 'nodejs';
// Bước hai đăng nhập: {code} là mã 6 số hoặc mã dự phòng dạng XXXX-XXXX
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        await completeChallenge(codeInput(body.code));
        return Response.json({ message: 'Đăng nhập thành công.' });
    });
}
