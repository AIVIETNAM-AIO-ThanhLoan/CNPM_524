import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/lib/session';
import TransactionForm from './transaction-form';
import { categories, wallets } from '@/app/lib/ledger';

export default async function NewTransaction() {
    const user = await getCurrentUser();
    if (!user) redirect('/login');
    const [accounts, options] = await Promise.all([wallets(user.id), categories(user.id)]);
    return <TransactionForm userId={user.id} initialWallets={accounts} initialCategories={options.map((c) => ({ id: c.id, name: c.name, kind: c.kind }))} />;
}
