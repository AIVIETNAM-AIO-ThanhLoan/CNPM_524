const DIGITS = { 'không': 0, 'một': 1, 'mốt': 1, 'hai': 2, 'ba': 3, 'bốn': 4, 'tư': 4, 'năm': 5, 'lăm': 5, 'nhăm': 5, 'sáu': 6, 'bảy': 7, 'bẩy': 7, 'tám': 8, 'chín': 9 };
const SCALES = { 'nghìn': 1000, 'ngàn': 1000, 'k': 1000, 'triệu': 1000000, 'tr': 1000000, 'tỷ': 1000000000, 'tỉ': 1000000000 };

function phraseValue(tokens) {
    let total = 0, group = 0, digit = 0, scale = 0, unit = 0;
    for (const token of tokens) {
        if (token in SCALES) {
            scale = SCALES[token]; unit = scale;
            total += (group + digit || 1) * scale;
            group = 0; digit = 0;
        } else if (token === 'trăm') { group += (digit || 1) * 100; digit = 0; scale = 100; }
        else if (token === 'mươi') { group += (digit || 1) * 10; digit = 0; }
        else if (token === 'mười') { group += 10; digit = 0; }
        else if (token === 'rưỡi') {
            if (scale === 100) group += 50; else if (scale) total += scale / 2;
        } else if (token in DIGITS) digit = DIGITS[token];
        else if (/^\d/.test(token)) digit = Number(token.replace(',', '.'));
    }
    const rest = group + digit;
    if (!unit || !rest || rest >= 1000) return total + rest;
    // Cách nói tắt: "1 triệu 2" = 1.200.000, "2 nghìn 500" = 2.500, "1 triệu 50" = 1.050.000.
    return total + rest * unit / (rest < 10 ? 10 : 1000);
}

function readAmount(input) {
    let text = input.normalize('NFC').toLowerCase();
    for (let previous = ''; previous !== text;) { previous = text; text = text.replace(/(\d)[.,\s](\d{3})(?!\d)/g, '$1$2'); }
    text = text.replace(/(\d)(k|tr|triệu|nghìn|ngàn|tỷ|tỉ)(?![\p{L}])/gu, '$1 $2 ').replace(/(tr|triệu|k|nghìn|ngàn)(\d)/g, '$1 $2');
    const words = text.split(/\s+/).map((raw) => raw.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    const phrases = [{ tokens: [], indexes: [] }];
    words.forEach((token, index) => {
        const numeric = /^\d+(?:[.,]\d+)?$/.test(token);
        const current = phrases[phrases.length - 1];
        if (numeric && current.tokens.length && /^\d/.test(current.tokens[current.tokens.length - 1])) phrases.push({ tokens: [token], indexes: [index] });
        else if (numeric || token in DIGITS || token in SCALES || ['trăm', 'mươi', 'mười', 'rưỡi', 'lẻ', 'linh'].includes(token)) { current.tokens.push(token); current.indexes.push(index); }
        else if (current.tokens.length) phrases.push({ tokens: [], indexes: [] });
    });
    let amount = 0, best = [];
    for (const { tokens, indexes } of phrases) {
        const value = phraseValue(tokens);
        if (value > amount) { amount = value; best = indexes; }
    }
    return { amount: Math.round(amount), rest: words.filter((word, index) => word && !best.includes(index)).join(' ') };
}

// Đọc số tiền VND từ câu nói, gồm chữ số ("1,5 triệu", "50k") và chữ ("năm mươi nghìn").
// Câu có nhiều số thì lấy cụm có giá trị lớn nhất, ví dụ "2 cái áo 300 nghìn" là 300.000.
export const parseVoiceAmount = (input) => readAmount(input).amount;

// Phần còn lại của câu sau khi bỏ số tiền, dùng để đoán tên danh mục.
export const removeVoiceAmount = (input) => readAmount(input).rest;
