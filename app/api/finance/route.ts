import { api, date, HttpError, text } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { finance } from '@/app/lib/ledger';

export async function GET(request: Request) {
    return api(async () => {
        const user = await requireUser();
        const params = new URL(request.url).searchParams;
        const start = date(params.get('start'));
        const end = date(params.get('end'));
        if (start > end || Date.parse(end) - Date.parse(start) > 366 * 86400000) throw new HttpError(400, 'Khoảng thời gian tối đa 366 ngày.');
        const search = text(params.get('q') || '', 'Từ khóa', 100, false);
        const rawPage = params.get('page') ?? '1';
        if (!/^[1-9]\d{0,4}$/.test(rawPage)) throw new HttpError(400, 'Trang không hợp lệ.');
        return Response.json(await finance(user.id, start, end, search, Number(rawPage)));
    });
}
