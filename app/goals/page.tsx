'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import BottomNav from '../components/BottomNav';
import { formatDate, formatDateTime, requestJson } from '../lib/client-api';
import '../styles/ledger.css';

type Goal = { id: string; name: string; targetAmount: string; savedAmount: string; dueOn: string | null; status: string };

export default function GoalsPage() {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [contributions, setContributions] = useState<Record<string, { id: string; amount: string; createdAt: string }[]>>({});
    const pending = useRef<{ payload: string; key: string } | null>(null);
    const load = useCallback(async () => {
        try { setGoals((await requestJson<{ goals: Goal[] }>('/api/goals')).goals); setError(''); }
        catch (err) { setError(err instanceof Error ? err.message : 'Không tải được mục tiêu.'); }
    }, []);
    useEffect(() => { void Promise.resolve().then(load); }, [load]);

    async function create(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const data = new FormData(form);
        setBusy(true); setError('');
        try {
            await requestJson('/api/goals', { name: data.get('name'), targetAmount: data.get('targetAmount'), dueOn: data.get('dueOn') });
            form.reset(); await load();
        } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được mục tiêu.'); }
        finally { setBusy(false); }
    }

    async function contribute(event: React.FormEvent<HTMLFormElement>, goalId: string) {
        event.preventDefault();
        if (busy) return;
        const form = event.currentTarget;
        const payload = { goalId, amount: new FormData(form).get('amount') };
        const fingerprint = JSON.stringify(payload);
        if (!pending.current || pending.current.payload !== fingerprint) pending.current = { payload: fingerprint, key: crypto.randomUUID() };
        setBusy(true); setError('');
        try {
            await requestJson('/api/goals/contributions', { ...payload, requestKey: pending.current.key });
            pending.current = null; form.reset(); await load();
            await showContributions(goalId);
        } catch (err) { setError(err instanceof Error ? err.message : 'Không lưu được khoản góp.'); }
        finally { setBusy(false); }
    }

    async function showContributions(goalId: string) {
        try { const result = await requestJson<{ contributions: { id: string; amount: string; createdAt: string }[] }>(`/api/goals/contributions?goalId=${goalId}`); setContributions((current) => ({ ...current, [goalId]: result.contributions })); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không tải được khoản góp.'); }
    }
    async function changeStatus(goal: Goal, status: string) {
        setBusy(true); setError('');
        try { await requestJson('/api/goals', { id: goal.id, status }); await load(); }
        catch (error) { setError(error instanceof Error ? error.message : 'Không cập nhật được mục tiêu.'); }
        finally { setBusy(false); }
    }

    return <main className="app-page ledger-page">
        <header className="page-header"><Link href="/">← Trang chủ</Link><h1 className="page-title">Mục tiêu tiết kiệm</h1></header>
        <p>Khoản góp được ghi thủ công để theo dõi tiến độ và không thay đổi số dư ví.</p>
        {error && <p className="ledger-error" role="alert">{error}</p>}
        <form className="card ledger-form" onSubmit={create}>
            <h2>Tạo mục tiêu</h2>
            <label>Tên mục tiêu<input name="name" maxLength={100} required /></label>
            <label>Số tiền mục tiêu (VND)<input name="targetAmount" type="number" min="1" max="999999999999" step="1" required /></label>
            <label>Ngày dự kiến<input name="dueOn" type="date" /></label>
            <button className="btn-primary" disabled={busy}>Tạo mục tiêu</button>
        </form>
        {goals.map((goal) => <section className="card" key={goal.id}>
            <h2>{goal.name}</h2>
            <p>Đã ghi {Number(goal.savedAmount).toLocaleString('vi-VN')} / {Number(goal.targetAmount).toLocaleString('vi-VN')}đ{goal.dueOn ? ` · Hạn ${formatDate(goal.dueOn)}` : ''}</p>
            <progress aria-label={`Tiến độ ${goal.name}`} max={Number(goal.targetAmount)} value={Math.max(0, Number(goal.savedAmount))} />
            <p>{goal.status === 'active' ? 'Đang theo dõi' : goal.status === 'achieved' ? 'Đã hoàn thành' : 'Đã đóng'}</p>
            <div className="action-row"><button className="btn-secondary" disabled={busy} onClick={() => showContributions(goal.id)}>Xem khoản góp</button>
                {goal.status === 'active' ? <><button className="btn-secondary" disabled={busy} onClick={() => changeStatus(goal, 'achieved')}>Đánh dấu hoàn thành</button><button className="btn-secondary" disabled={busy} onClick={() => changeStatus(goal, 'closed')}>Đóng mục tiêu</button></>
                    : <button className="btn-secondary" disabled={busy} onClick={() => changeStatus(goal, 'active')}>Mở lại mục tiêu</button>}</div>
            {contributions[goal.id] && <ul>{contributions[goal.id].map((item) => <li key={item.id}>{Number(item.amount).toLocaleString('vi-VN')}đ · {formatDateTime(item.createdAt)}</li>)}</ul>}
            {goal.status === 'active' && <form className="ledger-form" onSubmit={(event) => contribute(event, goal.id)}>
                <label>Số tiền góp (VND)<input name="amount" type="number" min="1" max="999999999999" step="1" required /></label>
                <button className="btn-secondary" disabled={busy}>Ghi khoản góp</button>
            </form>}
        </section>)}
        <BottomNav />
    </main>;
}
