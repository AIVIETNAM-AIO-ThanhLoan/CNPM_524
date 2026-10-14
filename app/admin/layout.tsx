import { redirect } from 'next/navigation';
import { getCurrentUser } from '../lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    if (user.role !== 'admin') redirect('/profile');
    return <><p className="data-status">Trang quản trị hiện là bản mẫu; các thao tác tỷ giá và sao lưu chưa kết nối backend.</p>{children}</>;
}
