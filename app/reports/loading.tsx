import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';

export default function Loading() {
    return <div className="app-page">
        <SkeletonStatus label="Đang tải báo cáo…" />
        <div className="skeleton-page-block skeleton-stack">
            <Skeleton height={44} style={{ borderRadius: 12 }} />
            <Skeleton height={48} style={{ borderRadius: 12 }} />
            <div className="skeleton-calendar">{Array.from({ length: 35 }, (_, index) => <Skeleton key={index} height={44} />)}</div>
        </div>
        <BottomNav />
    </div>;
}
