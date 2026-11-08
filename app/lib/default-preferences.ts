export type SpendingSource = { id: string; name: string; kind: 'wallet' | 'ewallet' | 'bank' };
export type DefaultPreferences = { walletId: string; androidApp: string; iosApp: string; spendingSources?: SpendingSource[] };
const empty: DefaultPreferences = { walletId: '', androidApp: '', iosApp: '' };
const CHANGED = 'cnpm-defaults-updated';
export function readDefaults(userId: string): DefaultPreferences {
    try {
        const value = JSON.parse(localStorage.getItem(`cnpm-defaults:${userId}`) || '{}');
        const defaults: DefaultPreferences = {
            walletId: typeof value?.walletId === 'string' ? value.walletId : '',
            androidApp: typeof value?.androidApp === 'string' ? value.androidApp : '',
            iosApp: typeof value?.iosApp === 'string' ? value.iosApp : '',
        };
        if (Array.isArray(value?.spendingSources)) {
            const sources = value.spendingSources.filter((item: SpendingSource) => item && typeof item.id === 'string'
                && item.id.length > 0 && item.id.length <= 100 && typeof item.name === 'string' && item.name.length > 0 && item.name.length <= 150
                && ['wallet', 'ewallet', 'bank'].includes(item.kind)).slice(0, 200) as SpendingSource[];
            defaults.spendingSources = Array.from(new Map(sources.map(item => [item.id, { id: item.id, name: item.name, kind: item.kind }])).values());
        }
        return defaults;
    } catch { return { ...empty }; }
}
export function saveDefaults(userId: string, value: DefaultPreferences) {
    localStorage.setItem(`cnpm-defaults:${userId}`, JSON.stringify(value));
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CHANGED, { detail: userId }));
}

export function subscribeDefaults(userId: string, onChange: () => void) {
    const storage = (event: StorageEvent) => { if (event.key === null || event.key === `cnpm-defaults:${userId}`) onChange(); };
    const changed = (event: Event) => { if ((event as CustomEvent<string>).detail === userId) onChange(); };
    window.addEventListener('storage', storage);
    window.addEventListener(CHANGED, changed);
    return () => { window.removeEventListener('storage', storage); window.removeEventListener(CHANGED, changed); };
}

export function bankPlatform(): 'ios' | 'android' {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) ? 'ios' : 'android';
}
