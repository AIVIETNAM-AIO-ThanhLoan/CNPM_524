import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonList } from '../components/Skeleton';

export default function Loading() {
    return <div className="app-page">
        <div className="skeleton-page-block skeleton-stack">
            <Skeleton width="40%" height={24} />
            <Skeleton height={44} style={{ borderRadius: 12 }} />
            <Skeleton height={44} style={{ borderRadius: 12 }} />
            <div className="skeleton-columns"><Skeleton height={72} style={{ borderRadius: 12 }} /><Skeleton height={72} style={{ borderRadius: 12 }} /></div>
        </div>
        <div className="skeleton-page-block"><SkeletonList rows={5} label="Đang tải lịch sử…" /></div>
        <BottomNav />
    </div>;
}
