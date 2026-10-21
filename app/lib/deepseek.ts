import 'server-only';

// Gọi DeepSeek qua HTTP (chuẩn chat/completions), theo cách làm của dự án AIO.
const BASE_URL = 'https://api.deepseek.com';
const RETRY_STATUS = new Set([429, 500, 502, 503, 504]);
// Chỉ giới hạn thời gian chờ đến khi có phản hồi đầu tiên; phần stream sau đó không bị cắt
const CONNECT_TIMEOUT_MS = 15000;

export type ToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
export type ToolDefinition = {
    type: 'function';
    function: { name: string; description: string; parameters: Record<string, unknown> };
};
export type ChatMessage =
    | { role: 'system' | 'user'; content: string }
    | { role: 'assistant'; content: string | null; tool_calls?: ToolCall[] }
    | { role: 'tool'; tool_call_id: string; content: string };

export type StreamEvent =
    | { type: 'text'; text: string }
    | { type: 'done'; toolCalls: ToolCall[]; finishReason: string | null };

/** Lỗi khi gọi DeepSeek: thiếu khóa, khóa sai, hết số dư, lỗi mạng hoặc API trả lỗi. */
export class LLMError extends Error {}

async function errorMessage(response: Response): Promise<string> {
    if (response.status === 401) return 'Khóa DEEPSEEK_API_KEY không hợp lệ.';
    if (response.status === 402) return 'Tài khoản DeepSeek đã hết số dư.';
    try {
        const data = await response.json();
        return `DeepSeek báo lỗi: ${data?.error?.message ?? `HTTP ${response.status}`}`;
    } catch {
        return `DeepSeek báo lỗi (HTTP ${response.status}).`;
    }
}

// Mở kết nối stream; lỗi tạm thời (hết thời gian chờ, 429, 5xx) được thử lại một lần
async function openStream(body: Record<string, unknown>, signal: AbortSignal): Promise<Response> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new LLMError('Thiếu DEEPSEEK_API_KEY trong .env.local.');
    let lastError = 'không rõ';
    for (let attempt = 0; attempt < 2; attempt++) {
        const controller = new AbortController();
        const onAbort = () => controller.abort();
        signal.addEventListener('abort', onAbort, { once: true });
        const timer = setTimeout(() => controller.abort(), CONNECT_TIMEOUT_MS);
        try {
            const response = await fetch(`${BASE_URL}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify(body),
                signal: controller.signal,
            });
            if (response.ok && response.body) return response;
            if (!RETRY_STATUS.has(response.status)) throw new LLMError(await errorMessage(response));
            lastError = `HTTP ${response.status}`;
        } catch (error) {
            if (error instanceof LLMError || signal.aborted) throw error;
            lastError = 'lỗi kết nối hoặc hết thời gian chờ';
        } finally {
            clearTimeout(timer);
        }
        signal.removeEventListener('abort', onAbort);
        if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new LLMError(`Gọi DeepSeek thất bại (${lastError}).`);
}

/**
 * Gọi DeepSeek ở chế độ stream. Trả về từng đoạn chữ, rồi một sự kiện `done`
 * kèm các lệnh gọi công cụ (nếu có) đã ghép đủ đối số.
 */
export async function* streamChat(options: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    toolChoice?: 'auto' | 'none';
    signal: AbortSignal;
}): AsyncGenerator<StreamEvent> {
    const body: Record<string, unknown> = {
        model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
        messages: options.messages,
        stream: true,
        // Trò chuyện cần trả lời nhanh nên tắt chế độ suy luận, giống router của AIO
        thinking: { type: 'disabled' },
    };
    if (options.tools?.length) {
        body.tools = options.tools;
        body.tool_choice = options.toolChoice ?? 'auto';
    }

    const response = await openStream(body, options.signal);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    const calls: ToolCall[] = [];
    let finishReason: string | null = null;
    let buffer = '';

    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
            if (!line.startsWith('data:')) continue; // bỏ dòng trống và dòng giữ kết nối
            const payload = line.slice(5).trim();
            if (payload === '[DONE]') continue;
            let chunk;
            try {
                chunk = JSON.parse(payload);
            } catch {
                continue;
            }
            const choice = chunk?.choices?.[0];
            if (!choice) continue;
            const delta = choice.delta ?? {};
            if (typeof delta.content === 'string' && delta.content) yield { type: 'text', text: delta.content };
            for (const part of delta.tool_calls ?? []) {
                const call = (calls[part.index] ??= { id: '', type: 'function', function: { name: '', arguments: '' } });
                if (part.id) call.id = part.id;
                if (part.function?.name) call.function.name += part.function.name;
                if (part.function?.arguments) call.function.arguments += part.function.arguments;
            }
            if (choice.finish_reason) finishReason = choice.finish_reason;
        }
    }
    yield { type: 'done', toolCalls: calls.filter(Boolean), finishReason };
}
