import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';
import '../styles/budgets.css';

export default function Loading() {
    return <main className="app-page budgets-page">
        <SkeletonStatus label="Đang tải ngân sách…" />
        <div className="skeleton-page-block skeleton-stack"><Skeleton height={112} style={{ borderRadius: 16 }} /><Skeleton height={44} style={{ borderRadius: 12 }} /></div>
        <div className="skeleton-grid skeleton-page-block">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} height={150} style={{ borderRadius: 16 }} />)}</div>
        <BottomNav />
    </main>;
}
