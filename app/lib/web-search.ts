import 'server-only';
import type { ToolDefinition } from './deepseek';

export type WebResult = { title: string; url: string; content: string };

const TAVILY_URL = 'https://api.tavily.com/search';
const MAX_RESULTS = 5;

// Công cụ khai báo cho DeepSeek: tra thông tin cập nhật bên ngoài ứng dụng
export const WEB_SEARCH_TOOL: ToolDefinition = {
    type: 'function',
    function: {
        name: 'tim_kiem_web',
        description: 'Tìm thông tin cập nhật trên internet như giá vàng, tỷ giá ngoại tệ, lãi suất ngân hàng, tin tức kinh tế. Không dùng cho số liệu thu chi của người dùng vì đã có sẵn.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Câu truy vấn ngắn gọn, nên ghi rõ thời điểm, ví dụ "giá vàng SJC hôm nay".' },
                topic: { type: 'string', enum: ['general', 'news', 'finance'], description: 'Loại tin: chung, tin tức hoặc tài chính.' },
            },
            required: ['query'],
            additionalProperties: false,
        },
    },
};

export const webSearchEnabled = () => Boolean(process.env.TAVILY_API_KEY);

/** Tìm trên web bằng Tavily. Trả về tối đa 5 kết quả, mỗi kết quả cắt ngắn để tiết kiệm token. */
export async function searchWeb(query: string, topic: string | undefined, signal: AbortSignal): Promise<WebResult[]> {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) throw new Error('Thiếu TAVILY_API_KEY.');
    const response = await fetch(TAVILY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
            query: query.slice(0, 400),
            max_results: MAX_RESULTS,
            search_depth: 'basic',
            topic: topic === 'news' || topic === 'finance' ? topic : 'general',
        }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]),
    });
    if (!response.ok) throw new Error(`Tavily HTTP ${response.status}`);
    const data = await response.json();
    const results: unknown[] = Array.isArray(data?.results) ? data.results : [];
    return results.slice(0, MAX_RESULTS).map((item) => {
        const r = item as Record<string, unknown>;
        return { title: String(r.title ?? ''), url: String(r.url ?? ''), content: String(r.content ?? '').slice(0, 800) };
    });
}
