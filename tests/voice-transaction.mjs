import assert from 'node:assert/strict';
import { parseVoiceTransaction } from '../app/lib/voice-transaction.ts';

const wallets = [{ id: 'cash', name: 'Tiền mặt' }, { id: 'bank', name: 'Ngân hàng' }];
const categories = [
    { id: 'food', name: 'Ăn uống', kind: 'expense' },
    { id: 'other', name: 'Khác', kind: 'expense' },
    { id: 'salary', name: 'Lương', kind: 'income' },
    { id: 'old', name: 'Danh mục cũ', kind: 'expense', archived: true },
];
const parse = (text) => parseVoiceTransaction(text, wallets, categories);
for (const [text, amount] of [
    ['Ăn uống 50 nghìn', '50000.00'], ['Ăn uống 50 ngàn', '50000.00'],
    ['Ăn uống 50k', '50000.00'], ['Ăn uống 50.000 đồng', '50000.00'],
    ['Ăn uống 1,5 triệu', '1500000.00'], ['Ăn uống 1.5 triệu', '1500000.00'],
    ['Ăn uống 1 triệu 500 nghìn', '1500000.00'],
    ['Ăn uống 1 triệu và 500 nghìn', '1500000.00'],
    ['Ăn uống 1.500.000', '1500000.00'], ['Ăn uống 100,05 đồng', '100.05'],
    ['Nhận lương 10 triệu', '10000000.00'],
]) assert.equal(parse(text).amount, amount, text);
assert.equal(parse('an uong 50 nghin').categoryId, 'food');
assert.equal(parse('Ăn uống 50 nghìn bằng ngân hàng').walletId, 'bank');
assert.equal(parse('Nhận được 1,5 triệu').kind, 'income');
assert.equal(parse('Nhận được 1,5 triệu').categoryId, 'salary');
assert.equal(parse('Ăn sáng 20 nghìn').categoryId, 'other');
assert.notEqual(parse('Danh mục cũ 20 nghìn').categoryId, 'old');
for (const text of ['', 'Ăn uống', 'Ăn uống 0 đồng', 'Nhận lương 1000 tỷ']) assert.throws(() => parse(text), /số tiền/);
assert.throws(() => parseVoiceTransaction('Ăn uống 50 nghìn', [], categories), /tạo ví/);
assert.throws(() => parseVoiceTransaction('Nhận được 50 nghìn', wallets, categories.filter((item) => item.kind === 'expense')), /thu nhập/);
console.log('PASS: 23 voice transaction checks (amounts, decimal units, income categories, wallets, archived categories, validation).');
