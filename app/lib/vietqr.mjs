export function crc16(value) {
    let crc = 0xffff;
    for (const byte of new TextEncoder().encode(value)) {
        crc ^= byte << 8;
        for (let bit = 0; bit < 8; bit++) crc = (crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1) & 0xffff;
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
}
function fields(value) {
    const result = {};
    let offset = 0;
    while (offset < value.length) {
        const header = value.slice(offset, offset + 4);
        if (!/^\d{4}$/.test(header)) throw new Error('Cấu trúc VietQR không hợp lệ.');
        const tag = header.slice(0, 2);
        const length = Number(header.slice(2));
        if (!length || offset + 4 + length > value.length || Object.hasOwn(result, tag)) throw new Error('Độ dài hoặc trường VietQR không hợp lệ.');
        result[tag] = value.slice(offset + 4, offset + 4 + length);
        offset += 4 + length;
    }
    return result;
}
export function parseVietQR(value) {
    if (typeof value !== 'string' || value.length > 2048 || !value.startsWith('000201') || !/6304[0-9A-Fa-f]{4}$/.test(value)
        || /[\u0000-\u001f\u007f]/.test(value) || crc16(value.slice(0, -4)) !== value.slice(-4).toUpperCase()) throw new Error('VietQR không hợp lệ hoặc sai mã kiểm tra CRC.');
    const root = fields(value);
    if (root['00'] !== '01' || root['53'] !== '704' || root['58'] !== 'VN' || !root['38'] || root['63'] !== value.slice(-4)
        || (root['01'] && !['11', '12'].includes(root['01']))) throw new Error('Chỉ hỗ trợ VietQR chuyển khoản VND tại Việt Nam.');
    const merchant = fields(root['38']);
    if (merchant['00'] !== 'A000000727' || merchant['02'] !== 'QRIBFTTA' || !merchant['01']) throw new Error('Chỉ hỗ trợ VietQR chuyển đến số tài khoản (QRIBFTTA).');
    const bank = fields(merchant['01']);
    if (!/^\d{6}$/.test(bank['00']) || !/^\d{4,34}$/.test(bank['01'])) throw new Error('Ngân hàng hoặc số tài khoản VietQR không hợp lệ.');
    const amount = root['54'] || '';
    if (amount && (!/^[1-9]\d{0,11}(?:\.0{1,2})?$/.test(amount))) throw new Error('Số tiền QR phải là VND nguyên dương, tối đa 12 chữ số.');
    const note = root['62'] ? fields(root['62'])['08'] || '' : '';
    return { bankBin: bank['00'], account: bank['01'], name: root['59'] || '', amount: amount ? String(Number(amount)) : '', note };
}

export function vietqrLink(recipient, bankCode, app, amount, note, returnOrigin) {
    if (!/^[a-z0-9-]{2,30}$/.test(app) || !/^[a-z0-9-]{2,30}$/.test(bankCode)
        || !/^[1-9]\d{0,11}$/.test(amount) || typeof note !== 'string' || !note.trim() || note.length > 99 || /[\u0000-\u001f\u007f]/.test(note)) throw new Error('Ứng dụng, số tiền hoặc nội dung chuyển không hợp lệ.');
    const origin = new URL(returnOrigin);
    if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('Địa chỉ ứng dụng không hợp lệ.');
    const url = new URL('https://dl.vietqr.io/pay');
    url.search = new URLSearchParams({ app, ba: `${recipient.account}@${bankCode}`, am: amount, tn: note.trim(), bn: recipient.name, url: `${origin.origin}/scan` }).toString();
    return url.toString();
}
