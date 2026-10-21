// Kiểm tra DEEPSEEK_API_KEY và TAVILY_API_KEY trong .env.local (hoặc biến môi trường của terminal).
// Mặc định chỉ gọi endpoint xem số dư/mức dùng. Thêm --chat để gửi thử một câu ngắn tới DeepSeek.
//   npm run test:ai-keys
//   npm run test:ai-keys -- --chat
import nextEnv from '@next/env';

nextEnv.loadEnvConfig(process.cwd());
const withChat = process.argv.includes('--chat');
let failed = false;

// Không in key ra màn hình: chỉ hiện vài ký tự đầu và độ dài
const mask = (key) => `${key.slice(0, 3)}… (${key.length} ký tự)`;
const ok = (msg) => console.log(`  ✔ ${msg}`);
const fail = (msg) => { console.log(`  ✘ ${msg}`); failed = true; };
const warn = (msg) => console.log(`  ! ${msg}`);

async function checkDeepSeek() {
    console.log('DeepSeek');
    const key = process.env.DEEPSEEK_API_KEY ?? '';
    if (!key) return fail('Chưa có DEEPSEEK_API_KEY.');
    console.log(`  key: ${mask(key)}`);
    if (!key.startsWith('sk-')) warn('Key DeepSeek thường bắt đầu bằng "sk-". Có thể bạn dán nhầm key khác.');

    const res = await fetch('https://api.deepseek.com/user/balance', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
    }).catch((error) => fail(`Không kết nối được: ${error.message}`));
    if (!res) return;
    if (res.status === 401) return fail('Key không hợp lệ (HTTP 401).');
    if (!res.ok) return fail(`DeepSeek trả lỗi HTTP ${res.status}.`);
    const data = await res.json();
    ok('Key hợp lệ.');
    for (const b of data.balance_infos ?? []) console.log(`  số dư: ${b.total_balance} ${b.currency}`);
    if (!data.is_available) return fail('Số dư không đủ để gọi API. Hãy nạp tiền tại platform.deepseek.com.');
    ok('Số dư đủ để gọi API.');

    if (!withChat) return;
    const chat = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify({
            model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
            messages: [{ role: 'user', content: 'Trả lời đúng một từ: xin chào' }],
            thinking: { type: 'disabled' },
            max_tokens: 20,
        }),
        signal: AbortSignal.timeout(30000),
    }).catch((error) => fail(`Gọi chat thất bại: ${error.message}`));
    if (!chat) return;
    if (!chat.ok) return fail(`Gọi chat lỗi HTTP ${chat.status}.`);
    const reply = (await chat.json())?.choices?.[0]?.message?.content ?? '';
    ok(`Chat trả lời: "${reply.trim()}"`);
}

async function checkTavily() {
    console.log('Tavily');
    const key = process.env.TAVILY_API_KEY ?? '';
    if (!key) return warn('Chưa có TAVILY_API_KEY. Trợ lý vẫn chạy nhưng không tìm được trên web.');
    console.log(`  key: ${mask(key)}`);
    const res = await fetch('https://api.tavily.com/usage', {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(15000),
    }).catch((error) => fail(`Không kết nối được: ${error.message}`));
    if (!res) return;
    if (res.status === 401) return fail('Key không hợp lệ (HTTP 401).');
    if (!res.ok) return fail(`Tavily trả lỗi HTTP ${res.status}.`);
    const data = await res.json();
    ok('Key hợp lệ.');
    if (data.account) console.log(`  gói: ${data.account.current_plan}, đã dùng ${data.account.plan_usage}/${data.account.plan_limit} credit`);
}

await checkDeepSeek();
await checkTavily();
console.log(failed ? '\nCó key chưa dùng được. Sửa .env.local rồi khởi động lại server.' : '\nCác key đều dùng được.');
process.exitCode = failed ? 1 : 0;
