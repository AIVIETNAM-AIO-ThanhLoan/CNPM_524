'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';

// Hộp xác nhận dùng chung, thay cho window.confirm của trình duyệt để mọi xác nhận có cùng giao diện,
// cùng vị trí nút và đổi màu theo chủ đề. Gọi askConfirm() ở bất kỳ đâu; ConfirmHost trong layout sẽ hiển thị.

export type ConfirmOptions = {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    danger?: boolean;
};
type Request = ConfirmOptions & { resolve: (accepted: boolean) => void };

let current: Request | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
    // Không có ConfirmHost (ví dụ trang lỗi) thì vẫn hỏi được bằng hộp của trình duyệt.
    if (!listeners.size) return Promise.resolve(window.confirm(`${options.title}\n\n${options.message}`));
    return new Promise((resolve) => {
        current?.resolve(false);
        current = { ...options, resolve };
        notify();
    });
}

function finish(accepted: boolean) {
    const request = current;
    current = null;
    notify();
    request?.resolve(accepted);
}

export function ConfirmHost() {
    const request = useSyncExternalStore(subscribe, () => current, () => null);
    const dialog = useRef<HTMLDialogElement>(null);
    useEffect(() => {
        const element = dialog.current;
        if (!element) return;
        if (request && !element.open) element.showModal();
        if (!request && element.open) element.close();
    }, [request]);

    return <dialog ref={dialog} className="app-dialog" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-message"
        // Esc hoặc bấm ngoài hộp: luôn hiểu là Hủy, không bao giờ tự xác nhận.
        onCancel={(event) => { event.preventDefault(); finish(false); }}>
        {request && <>
            <div className="app-dialog-header"><h2 id="confirm-dialog-title">{request.title}</h2></div>
            <p id="confirm-dialog-message" className="app-dialog-text">{request.message}</p>
            <div className="app-dialog-actions">
                {/* Với thao tác nguy hiểm, con trỏ đặt sẵn ở nút Hủy để bấm Enter nhầm cũng không mất dữ liệu. */}
                <button type="button" className="btn-secondary" autoFocus={request.danger} onClick={() => finish(false)}>{request.cancelLabel || 'Hủy'}</button>
                <button type="button" className={request.danger ? 'btn-danger' : 'btn-primary'} autoFocus={!request.danger} onClick={() => finish(true)}>{request.confirmLabel}</button>
            </div>
        </>}
    </dialog>;
}
