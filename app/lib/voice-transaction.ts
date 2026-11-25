import type { Category, Wallet } from './client-api';

const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');

export function parseVoiceTransaction(transcript: string, wallets: Wallet[], categories: Category[]) {
    const text = normalize(transcript);
    const units: Record<string, bigint> = { ty: BigInt(1000000000), trieu: BigInt(1000000), nghin: BigInt(1000), ngan: BigInt(1000), k: BigInt(1000), tram: BigInt(100) };
    const matches = [...text.matchAll(/(\d+(?:[.,]\d+)*)(?:\s*(ty|trieu|nghin|ngan|k|tram))?\b/g)];
    const amounts = matches.some((match) => match[2]) ? matches.filter((match) => match[2]) : matches;
    const hundred = BigInt(100);
    let cents = BigInt(0);
    let group = BigInt(0);
    let previousUnit = BigInt(0);
    let previousEnd = -1;
    for (const match of amounts) {
        const digits = /^\d{1,3}(?:[.,]\d{3})+$/.test(match[1]) ? match[1].replace(/[.,]/g, '') : match[1].replace(',', '.');
        if (!/^\d+(?:\.\d+)?$/.test(digits)) continue;
        const [whole, fraction = ''] = digits.split('.');
        const divisor = BigInt(10) ** BigInt(fraction.length);
        const unit = units[match[2]] || BigInt(1);
        const value = BigInt(whole + fraction) * unit * hundred;
        if (value % divisor !== BigInt(0)) continue;
        const amount = value / divisor;
        group = match[2] && unit < previousUnit && /^\s*(?:va\s*)?$/.test(text.slice(previousEnd, match.index)) ? group + amount : amount;
        if (group > cents) cents = group;
        previousUnit = unit;
        previousEnd = match.index + match[0].length;
    }
    if (cents <= BigInt(0) || cents > BigInt('99999999999999')) throw new Error('Không nhận diện được số tiền hợp lệ. Hãy nói rõ, ví dụ: "Ăn uống 50 nghìn".');

    const available = categories.filter((category) => !category.archived);
    const matched = [...available].sort((a, b) => b.name.length - a.name.length).find((category) => text.includes(normalize(category.name)));
    const kind = /\b(thu nhap|nhan duoc|nhan luong|tien luong)\b/.test(text) ? 'income' : matched?.kind || 'expense';
    const options = available.filter((category) => category.kind === kind);
    const category = matched?.kind === kind ? matched : options.find((item) => normalize(item.name).includes('khac')) || options[0];
    const wallet = wallets.find((item) => text.includes(normalize(item.name))) || wallets[0];
    if (!wallet) throw new Error('Bạn cần tạo ví trước khi ghi giao dịch bằng giọng nói.');
    if (!category) throw new Error(`Bạn cần tạo danh mục ${kind === 'income' ? 'thu nhập' : 'chi tiêu'} trước khi ghi giao dịch.`);

    return {
        kind, walletId: wallet.id, categoryId: category.id,
        amount: `${cents / hundred}.${String(cents % hundred).padStart(2, '0')}`,
        note: `Ghi âm: ${transcript}`.slice(0, 500),
    };
}
