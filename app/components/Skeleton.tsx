import type { CSSProperties } from 'react';

type SkeletonProps = { width?: number | string; height?: number | string; circle?: boolean; onBrand?: boolean; style?: CSSProperties };

// Khối giữ chỗ khi đang tải; hiệu ứng trong globals.css. onBrand dùng trên nền xanh của thẻ tổng quan.
export function Skeleton({ width = '100%', height = 14, circle = false, onBrand = false, style }: SkeletonProps) {
    return <span aria-hidden="true" className={`skeleton${onBrand ? ' skeleton-on-brand' : ''}`} style={{ width, height, borderRadius: circle ? '50%' : undefined, ...style }} />;
}

// Nội dung ẩn cho trình đọc màn hình, thay cho dòng chữ "Đang tải..." trước đây.
export function SkeletonStatus({ label = 'Đang tải dữ liệu…' }: { label?: string }) {
    return <p className="skeleton-status" role="status">{label}</p>;
}

export function SkeletonList({ rows = 4, label }: { rows?: number; label?: string }) {
    return <div className="skeleton-list">
        <SkeletonStatus label={label} />
        {Array.from({ length: rows }, (_, index) => <div className="skeleton-row" key={index}>
            <Skeleton width={40} height={40} circle style={{ flexShrink: 0 }} />
            <div className="skeleton-row-text"><Skeleton width="60%" /><Skeleton width="40%" height={12} /></div>
            <Skeleton width={72} style={{ flexShrink: 0 }} />
        </div>)}
    </div>;
}
