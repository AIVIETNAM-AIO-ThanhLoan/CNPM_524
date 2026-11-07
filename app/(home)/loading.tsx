import BottomNav from '../components/BottomNav';
import { Skeleton, SkeletonStatus } from '../components/Skeleton';
import '../styles/home.css';

export default function Loading() {
    return <div className="app-page has-assistant-fab">
        <SkeletonStatus label="Đang tải trang chủ…" />
        <header className="home-header"><div className="header-top">
            <Skeleton height={44} style={{ flex: 1, borderRadius: 12 }} />
            <Skeleton width={40} height={40} circle />
        </div></header>
        <section className="card summary-card">
            <div className="skeleton-stack">
                <Skeleton onBrand height={44} style={{ borderRadius: 12 }} />
                <Skeleton onBrand height={40} style={{ borderRadius: 12 }} />
                <div className="skeleton-columns"><Skeleton onBrand height={40} /><Skeleton onBrand height={40} /><Skeleton onBrand height={40} /></div>
                <Skeleton onBrand height={8} />
            </div>
        </section>
        <div className="skeleton-columns skeleton-page-block"><Skeleton height={46} style={{ borderRadius: 12 }} /><Skeleton height={46} style={{ borderRadius: 12 }} /></div>
        <div className="skeleton-grid skeleton-page-block"><Skeleton height={104} /><Skeleton height={104} /><Skeleton height={104} /><Skeleton height={104} /></div>
        <BottomNav />
    </div>;
}
