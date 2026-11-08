import { readBudgets } from '@/app/lib/budgets-read';
import { readGoals } from '@/app/lib/goals-read';
import { vietnamToday } from '@/app/lib/notification-jobs.mjs';
import { api } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { wallets, categories, finance } from '@/app/lib/ledger';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const end = vietnamToday();
        const start = `${end.slice(0, 7)}-01`;
        const [accounts, options, summary, budgets, goals] = await Promise.all([wallets(user.id), categories(user.id), finance(user.id, start, end), readBudgets(user.id, start), readGoals(user.id)]);
        return Response.json({ userId: user.id, wallets: accounts, categories: options, snapshot: { savedAt: new Date().toISOString(), start, end, finance: summary, budgets, goals } }, { headers: { 'Cache-Control': 'private, no-store' } });
    });
}
