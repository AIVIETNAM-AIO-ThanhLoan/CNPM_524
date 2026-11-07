import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';

export default function Loading() {
    return <div className="app-page">
        <SkeletonStatus label="Đang tải hồ sơ…" />
        <div className="skeleton-page-block skeleton-stack">
            <div className="skeleton-row"><Skeleton width={64} height={64} circle style={{ flexShrink: 0 }} /><div className="skeleton-row-text"><Skeleton width="50%" height={18} /></div></div>
            <Skeleton height={120} style={{ borderRadius: 16 }} />
        </div>
        <BottomNav />
    </div>;
}
