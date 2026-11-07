import { redirect } from 'next/navigation';

// "QR của tôi" nay là một tab của trang Quét QR; giữ đường dẫn cũ cho các link đã lưu.
export default function Page() {
    redirect('/scan?tab=my-qr');
}
