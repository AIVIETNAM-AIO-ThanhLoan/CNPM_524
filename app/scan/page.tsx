import BottomNav from '../components/BottomNav';
import '../styles/scan.css';

// Logic đọc mã QR đã được gỡ bỏ; trang giữ chỗ để nút QR trên thanh điều hướng vẫn mở được.
export default function Scan() {
    return (
        <div className="app-page">
            <header className="page-header">
                <h1 className="page-title">Quét QR</h1>
            </header>
            <p className="scan-placeholder">Tính năng quét mã QR đang được làm lại.</p>
            <BottomNav />
        </div>
    );
}
