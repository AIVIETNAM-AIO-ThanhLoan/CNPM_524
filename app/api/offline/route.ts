import { api } from '@/app/lib/http';
import { requireUser } from '@/app/lib/session';
import { wallets, categories } from '@/app/lib/ledger';

export async function GET() {
    return api(async () => {
        const user = await requireUser();
        const [accounts, options] = await Promise.all([wallets(user.id), categories(user.id)]);
        return Response.json({ userId: user.id, wallets: accounts, categories: options });
    });
}
