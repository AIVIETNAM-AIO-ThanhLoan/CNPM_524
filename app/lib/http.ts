import 'server-only';

export class HttpError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

function checkOrigin(request: Request) {
    const origin = request.headers.get('origin');
    const expected = process.env.APP_ORIGIN || new URL(request.url).origin;
    if (!origin || origin !== expected) throw new HttpError(403, 'Nguồn yêu cầu không hợp lệ. Hãy mở đúng địa chỉ ứng dụng.');
}

async function readBody(request: Request, limit: number, tooLarge: string): Promise<Buffer> {
    const reader = request.body?.getReader();
    if (!reader) throw new HttpError(400, 'Thiếu dữ liệu.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > limit) { await reader.cancel(); throw new HttpError(413, tooLarge); }
        chunks.push(value);
    }
    return Buffer.concat(chunks);
}

export async function jsonBody(request: Request): Promise<Record<string, unknown>> {
    checkOrigin(request);
    if (!request.headers.get('content-type')?.startsWith('application/json')) throw new HttpError(415, 'Yêu cầu phải dùng JSON.');
    const data = await readBody(request, 16384, 'Dữ liệu quá lớn.');
    try {
        const body = JSON.parse(data.toString('utf8'));
        if (!body || Array.isArray(body) || typeof body !== 'object') throw new Error();
        return body;
    } catch { throw new HttpError(400, 'JSON không hợp lệ.'); }
}

export const IMAGE_LIMIT = 2 * 1024 * 1024;

// Loại ảnh xác định theo chữ ký đầu file, không tin Content-Type do trình duyệt gửi.
export async function imageBody(request: Request): Promise<{ mime: 'image/png' | 'image/jpeg' | 'image/webp'; data: Buffer }> {
    checkOrigin(request);
    const data = await readBody(request, IMAGE_LIMIT, 'Ảnh quá lớn (tối đa 2 MB).');
    if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', data };
    if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return { mime: 'image/jpeg', data };
    if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', data };
    throw new HttpError(415, 'Chỉ nhận ảnh PNG, JPEG hoặc WebP.');
}

export function text(value: unknown, label: string, max: number, required = true): string {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) {
        throw new HttpError(400, `${label} không hợp lệ (tối đa ${max} ký tự).`);
    }
    return value.trim();
}

export function uuid(value: unknown): string {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) throw new HttpError(400, 'Mã tham chiếu không hợp lệ.');
    return value;
}

export function date(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)
        || value < '1000-01-01' || value > '9999-12-31'
        || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new HttpError(400, 'Ngày không hợp lệ.');
    return value;
}

// Ledger amounts are validated as decimal text; never calculated with floats.
export function money(value: unknown): string {
    if (typeof value !== 'string' || !/^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/.test(value)) throw new HttpError(400, 'Số tiền phải lớn hơn 0, tối đa 12 chữ số và 2 chữ số thập phân.');
    const [whole, fraction = ''] = value.split('.');
    if (BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0')) === BigInt(0)) throw new HttpError(400, 'Số tiền phải lớn hơn 0.');
    return `${whole}.${fraction.padEnd(2, '0')}`;
}

export async function api(work: () => Promise<Response>): Promise<Response> {
    try {
        const response = await work();
        response.headers.set('Cache-Control', 'no-store');
        return response;
    } catch (error) {
        if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status, headers: { 'Cache-Control': 'no-store' } });
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') return Response.json({ error: 'Thông tin đã tồn tại hoặc giao dịch đã được ghi. Hãy tải lại để kiểm tra.' }, { status: 409 });
        console.error('Backend request failed:', error instanceof Error ? error.name : 'UnknownError');
        return Response.json({ error: 'Không thể xử lý yêu cầu. Kiểm tra MySQL và cấu hình database.' }, { status: 503 });
    }
}
