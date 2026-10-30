import { api, HttpError, jsonBody } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { parseVietQR, vietqrLink } from '@/app/lib/vietqr.mjs';

type Bank = { bin: string; code: string; name: string; shortName: string };
type BankApp = { appId: string; appName: string; autofill: number };
async function options(platform: unknown) {
    if (platform !== 'ios' && platform !== 'android') throw new HttpError(400, 'Hệ điều hành không hợp lệ.');
    try {
        const [bankResponse, appResponse] = await Promise.all([
            fetch('https://api.vietqr.io/v2/banks', { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) }),
            fetch(`https://api.vietqr.io/v2/${platform}-app-deeplinks`, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(10000) }),
        ]);
        if (!bankResponse.ok || !appResponse.ok) throw new Error();
        const bankData = await bankResponse.json(); const appData = await appResponse.json();
        if (!Array.isArray(bankData.data) || !Array.isArray(appData.apps)) throw new Error();
        const banks: Bank[] = bankData.data.filter((b: Bank) => /^\d{6}$/.test(b.bin) && typeof b.code === 'string' && /^[a-z0-9-]{2,30}$/i.test(b.code));
        const apps: BankApp[] = appData.apps.filter((a: BankApp) => /^[a-z0-9-]{2,30}$/.test(a.appId) && typeof a.appName === 'string')
            .map((a: BankApp) => ({ appId: a.appId, appName: a.appName, autofill: Number(a.autofill) === 1 ? 1 : 0 }));
        if (!banks.length || !apps.length) throw new Error();
        return { banks, apps };
    } catch { throw new HttpError(502, 'Không tải được danh sách ngân hàng VietQR. Kiểm tra mạng và thử lại.'); }
}
export async function GET(request: Request) {
    return api(async () => { await requireUser(); return Response.json(await options(new URL(request.url).searchParams.get('platform') || 'android')); });
}
export async function POST(request: Request) {
    return api(async () => {
        const body = await jsonBody(request);
        await requireUser();
        let recipient;
        if (body.qr !== undefined) {
            try { recipient = parseVietQR(body.qr); } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'VietQR không hợp lệ.'); }
        } else {
            if (typeof body.bankBin !== 'string' || !/^\d{6}$/.test(body.bankBin)
                || typeof body.account !== 'string' || !/^\d{4,34}$/.test(body.account)) throw new HttpError(400, 'Ngân hàng hoặc số tài khoản không hợp lệ.');
            recipient = { bankBin: body.bankBin, account: body.account, name: '' };
        }
        const { banks, apps } = await options(body.platform);
        const bank = banks.find((b) => b.bin === recipient.bankBin);
        if (!bank || !apps.some((a) => a.appId === body.app)) throw new HttpError(400, 'Ngân hàng hoặc ứng dụng không được hỗ trợ.');
        try {
            return Response.json({ url: vietqrLink(recipient, bank.code.toLowerCase(), body.app, body.amount, body.note, process.env.APP_ORIGIN || new URL(request.url).origin) });
        } catch (error) { throw new HttpError(400, error instanceof Error ? error.message : 'Thông tin chuyển không hợp lệ.'); }
    });
}
