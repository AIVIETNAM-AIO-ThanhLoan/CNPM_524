import type { Wallet } from './client-api';
import type { SpendingSource } from './default-preferences';

export type SpendingSourceOption = { value: string; name: string; balance: string; walletId?: string; source?: SpendingSource };
const normalized = (name: string) => name.trim().normalize('NFC').toLocaleLowerCase('vi-VN');

export function spendingSourceOptions(wallets: Wallet[], selected: SpendingSource[] | undefined): SpendingSourceOption[] {
    if (selected === undefined) return wallets.map(wallet => ({ value: wallet.id, walletId: wallet.id, name: wallet.name, balance: wallet.balance }));
    const used = new Set<string>();
    const options: SpendingSourceOption[] = [];
    for (const source of selected) {
        const wallet = source.kind === 'wallet' ? wallets.find(wallet => `wallet:${wallet.id}` === source.id)
            : wallets.find(wallet => wallet.sourceKey === source.id)
                || wallets.find(wallet => !wallet.sourceKey && normalized(wallet.name) === normalized(source.name));
        if (source.kind === 'wallet' && !wallet) continue;
        const identity = wallet?.id || source.id;
        if (used.has(identity)) continue;
        used.add(identity);
        options.push(source.kind === 'wallet'
            ? { value: wallet!.id, walletId: wallet!.id, name: wallet!.name, balance: wallet!.balance }
            : { value: source.id, walletId: wallet?.id, name: source.name, balance: wallet?.balance || '0', source });
    }
    return options;
}
