import ChatClient from './chat-client';
import { getCurrentUser } from '../lib/session';

// Lấy tên tài khoản đang đăng nhập ở server để hiện trong lời chào
export default async function ChatPage() {
    const user = await getCurrentUser();
    return <ChatClient userName={user?.name ?? null} />;
}
