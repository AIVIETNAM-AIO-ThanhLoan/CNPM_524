import assert from 'node:assert/strict';
import { parseVoiceAmount, removeVoiceAmount } from '../app/lib/voice-amount.mjs';

const cases = [
    ['ăn uống 50 nghìn', 50000], ['Ăn uống 50.000 đồng', 50000], ['50k', 50000],
    ['1 triệu 500 nghìn', 1500000], ['1,5 triệu', 1500000], ['1 triệu rưỡi', 1500000],
    ['1tr5', 1500000], ['năm mươi nghìn', 50000], ['hai mươi lăm nghìn', 25000],
    ['một trăm linh năm nghìn', 105000], ['mua 2 cái áo 300 nghìn', 300000], ['ăn uống', 0],
    ['ăn uống 1 triệu và 500 nghìn', 1500000],
    ['ăn uống một triệu và năm trăm nghìn', 1500000],
    ['chi 2 triệu và 30 nghìn', 2030000],
    ['ăn uống âm 50 nghìn', 0], ['ăn uống -50 nghìn', 0],
    ['ăn uống −50 nghìn', 0], ['âm năm mươi nghìn', 0], ['(-50 nghìn)', 0],
];
for (const [text, amount] of cases) assert.equal(parseVoiceAmount(text), amount, text);
assert.equal(removeVoiceAmount('mua sách một triệu và năm trăm nghìn'), 'mua sách');
assert.equal(removeVoiceAmount('Mua sách năm mươi nghìn'), 'mua sách');
console.log(`PASS: ${cases.length + 2} checks of the amount parser used by VoiceAssistant.`);
